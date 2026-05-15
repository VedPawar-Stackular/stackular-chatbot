## How the AI Actually Works — Internal Deep Dive

### The Core Problem: Finding Relevant Text at Query Time

You have ~hundreds of text chunks in Pinecone from `knowledge_base.md`. When a user asks something, you need to find the **10 most relevant chunks** out of all of them — fast, without reading every one. That's what vector search solves.

### Dense Vectors (Semantic Search)

**Model:** `BAAI/bge-small-en` — a 384-dimensional sentence embedding model loaded locally via `sentence-transformers`.

**What it does:** It converts any text — a sentence, a paragraph, a question — into a list of 384 floating point numbers. These numbers encode _meaning_, not just words. Semantically similar sentences map to nearby points in 384-dimensional space.

```
"How much does a project cost?"  →  [0.12, -0.87, 0.04, ...]  (384 numbers)
"What is your pricing?"          →  [0.11, -0.89, 0.06, ...]  (very close!)
"What is your refund policy?"    →  [0.09, -0.32, 0.71, ...]  (far away)
```

**At index time** (rag\_service.py:91):

```python
embeddings = embedder.encode(all_chunks, show_progress_bar=True)
```

Every chunk gets encoded into a 384-dim vector and stored in Pinecone alongside its text as metadata.

**At query time** (rag\_service.py:116):

```python
dense = embedder.encode([question]).tolist()[0]
```

The user's question gets encoded with the **same model**. Pinecone then finds the stored vectors closest to it using `dotproduct` similarity — which, because the vectors are normalized by bge-small-en, is equivalent to cosine similarity.

**Strength:** Understands meaning. "Cost" and "pricing" match even though the words differ.  
**Weakness:** Bad at exact keyword matching. If someone asks about "Jason Storch" it might miss chunks where that exact name appears but isn't semantically central.

### Sparse Vectors (BM25 Keyword Search)

**Model:** `BM25Encoder` from `pinecone-text`. BM25 is the classic IR (information retrieval) algorithm — the same idea behind how search engines worked before neural networks.

**What it does:** Represents text as a sparse vector where the non-zero dimensions correspond to specific vocabulary terms, weighted by TF-IDF-style scoring. "Sparse" means most of the ~30,000 vocabulary dimensions are zero — only the words that actually appear get non-zero values.

```
"Jason Storch CEO Stackular"  →  {word_id_4821: 0.94, word_id_11023: 0.81, ...}
                                   ("jason")             ("storch")
```

**At index time** (rag\_service.py:86-92):

```python
bm25 = BM25Encoder()
bm25.fit(all_chunks)       # learns vocabulary + IDF weights from the whole corpus
bm25.dump(bm25_path)       # saves to bm25_params.json
sparse_embeddings = bm25.encode_documents(all_chunks)
```

`fit()` scans all chunks to build a vocabulary and calculate IDF (Inverse Document Frequency) — words that appear in many chunks (like "we", "our") get low weight; rare words (like "BM25", "GSA", "Jason") get high weight.

`encode_documents()` then produces a sparse vector for each chunk using those learned weights.

**At query time** (rag\_service.py:121):

```python
bm25 = BM25Encoder().load(bm25_path)
sparse = bm25.encode_queries(question)
```

The query gets encoded with the same vocabulary. If someone asks "Who is Jason Storch?", the BM25 vector has a very high weight on the "jason" and "storch" dimensions, so it will directly pull up chunks where those exact words appear.

**Strength:** Exact name/term matching. Perfect for proper nouns, jargon, acronyms (GSA, HIPAA, BM25).  
**Weakness:** No semantic understanding. "Cost" won't match a chunk that only says "pricing."

### Hybrid Search — Combining Both

Neither alone is sufficient. The system uses both simultaneously via `hybrid_score_norm()` (rag\_service.py:22-30):

```python
def hybrid_score_norm(dense, sparse, alpha: float):
    hdense  = [v * alpha for v in dense]         # scale dense by 0.7
    hsparse = {values: [v * (1-alpha) for v in sparse.values]}  # scale sparse by 0.3
    return hdense, hsparse
```

With `alpha=0.7`:

-   Dense vector scores are multiplied by **0.7** (70% weight)
-   BM25 sparse scores are multiplied by **0.3** (30% weight)

Pinecone receives both scaled vectors in a single query and computes a combined score for every stored chunk:

```
final_score = 0.7 × (dense_similarity) + 0.3 × (bm25_keyword_score)
```

The top 10 chunks by this combined score are returned. This means a chunk wins if it's either **semantically close** OR **contains the exact keywords** — ideally both.

**Why `dotproduct` is mandatory:** Pinecone's hybrid search only works when the index metric is `dotproduct`. The previous index used `cosine`, which doesn't support sparse vectors — that was the crash bug that required deleting and recreating the index.

### Why This Architecture?

```
User: "Do you have AWS certifications?"

Dense alone might return:
  → "Cloud Infrastructure" section (semantically similar, mentions cloud expertise)
  → BUT might miss the specific "AWS partner" mention buried in the Certifications section

BM25 alone would return:
  → Any chunk containing the word "AWS" (great for exact match)
  → BUT might miss semantically related chunks about cloud credentials

Hybrid (0.7 dense + 0.3 BM25) returns:
  → The certifications section (high BM25 score for "AWS" + reasonable semantic score)
  → The cloud expertise section (high dense score, lower BM25)
  → The portfolio cases mentioning AWS (moderate both)
```

### After Retrieval: The LLM Prompt

The 10 retrieved chunks, plus the last 5 turns of conversation history, get assembled into the prompt by `_build_prompt()`. The LLM (Llama 3.3 70B via Groq) sees:

```
[System persona]
[Conversation history — last 5 turns]
[10 retrieved context chunks, each with source URL]
[8 response guidelines]
[1 few-shot example enforcing bullet-list format]
[Visitor's question]
→ Answer:
```

Temperature 0.3 keeps answers grounded in the retrieved context with low randomness. The LLM's job is to synthesize the retrieved chunks into a coherent, branded answer — not to invent information.

The response streams token-by-token back to the frontend via `text/event-stream`, which is why the text appears incrementally rather than all at once.