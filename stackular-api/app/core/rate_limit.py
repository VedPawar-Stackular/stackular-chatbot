from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter, keyed by client IP. Defined in its own module so both main.py
# (registration) and the route modules (decorators) can import it without a
# circular dependency on main.
limiter = Limiter(key_func=get_remote_address)
