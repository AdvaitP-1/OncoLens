from typing import Any

from app.utils.math import round_floats as _round_floats


def round_floats(value: Any, digits: int = 6) -> Any:
    return _round_floats(value, ndigits=digits)
