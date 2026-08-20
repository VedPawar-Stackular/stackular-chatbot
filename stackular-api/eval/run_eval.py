"""Lightweight RAG evaluation harness.

Measures retrieval recall@k (does the retrieved context contain the expected
facts?) and, optionally, an LLM-judged faithfulness score for generated answers.

Run from the stackular-api directory with the project venv:

    ./venv/Scripts/python.exe eval/run_eval.py            # retrieval recall only
    ./venv/Scripts/python.exe eval/run_eval.py --judge    # also score answer faithfulness

Multi-turn items include a "history" field; the harness runs condense_question
on them first, exercising the conversational query-rewriting path. Use it to
compare quality before/after retrieval changes (git stash to A/B).
"""

import os
import sys
import json
import argparse
import asyncio

# Make `app` importable when run from anywhere.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_groq import ChatGroq           # noqa: E402
from langchain_core.messages import HumanMessage  # noqa: E402

from app.api.deps import get_index, get_embedder  # noqa: E402
from app.services.rag_service import (             # noqa: E402
    retrieve,
    condense_question,
    _build_prompt,
)
from app.core.config import settings              # noqa: E402

EVAL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_set.jsonl")


def _format_history(history) -> str:
    """Match rag_service.get_history()'s format so condensing sees the real shape."""
    if not history:
        return ""
    s = "\n--- Recent Conversation History ---\n"
    for turn in history:
        s += f"Visitor: {turn['q']}\nAssistant: {turn['a']}\n"
    return s


def _load_items():
    items = []
    with open(EVAL_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                items.append(json.loads(line))
    return items


async def _judge_faithfulness(question: str, chunks: list) -> int:
    """Ask the chat model to rate (1-5) how fully a generated answer is grounded."""
    context = "\n\n---\n\n".join(f"Content: {c['text']}\nSource: {c['source']}" for c in chunks)
    answer_llm = ChatGroq(model=settings.CHAT_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.3)
    answer = (await answer_llm.ainvoke([HumanMessage(content=_build_prompt(question, context, ""))])).content

    judge_prompt = (
        "You are evaluating whether an ANSWER is fully supported by the provided CONTEXT.\n"
        "Score 1-5: 5 = every claim is grounded in the context; 1 = mostly fabricated.\n"
        "Reply with ONLY the integer.\n\n"
        f"CONTEXT:\n{context}\n\nANSWER:\n{answer}\n\nScore:"
    )
    judge_llm = ChatGroq(model=settings.CHAT_MODEL, api_key=settings.GROQ_API_KEY, temperature=0)
    raw = (await judge_llm.ainvoke([HumanMessage(content=judge_prompt)])).content.strip()
    for ch in raw:
        if ch.isdigit():
            return int(ch)
    return 0


async def run(judge: bool = False):
    index = get_index()
    embedder = get_embedder()
    items = _load_items()

    hits = 0
    judge_scores = []

    print(f"\nRunning {len(items)} eval cases (rerank_top_n={settings.RERANK_TOP_N})...\n")
    for item in items:
        q = item["question"]
        history = item.get("history")
        search_q = await condense_question(q, _format_history(history)) if history else q

        chunks = retrieve(search_q, index, embedder)
        blob = "\n".join(f"{c.get('text', '')} {c.get('source', '')}" for c in chunks).lower()
        expects = [e.lower() for e in item.get("expect_any", [])]
        hit = any(e in blob for e in expects) if expects else False
        hits += 1 if hit else 0

        tag = "PASS" if hit else "FAIL"
        rewritten = f"  (rewritten: {search_q})" if history and search_q != q else ""
        print(f"  [{tag}] {q}{rewritten}")
        if not hit:
            print(f"         expected any of {expects}; not found in top-{len(chunks)} chunks")

        if judge:
            score = await _judge_faithfulness(q, chunks)
            judge_scores.append(score)
            print(f"         faithfulness: {score}/5")

    recall = hits / len(items) if items else 0
    print(f"\nRetrieval recall@{settings.RERANK_TOP_N}: {hits}/{len(items)} = {recall:.0%}")
    if judge and judge_scores:
        avg = sum(judge_scores) / len(judge_scores)
        print(f"Mean faithfulness: {avg:.2f}/5")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--judge", action="store_true", help="Also LLM-judge answer faithfulness (uses Groq).")
    args = parser.parse_args()
    asyncio.run(run(judge=args.judge))
