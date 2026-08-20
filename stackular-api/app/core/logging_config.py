import logging
import sys

_CONFIGURED = False


def setup_logging(level: str = "INFO") -> None:
    """Configure the 'stackular' logger namespace with a stdout handler.

    We attach our own handler (rather than logging.basicConfig, which is often a
    no-op once uvicorn has configured the root logger) and disable propagation so
    our structured analytics lines appear exactly once. All app loggers are named
    'stackular.<area>' so they inherit this handler.
    """
    global _CONFIGURED
    if _CONFIGURED:
        return
    logger = logging.getLogger("stackular")
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s | %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
    _CONFIGURED = True
