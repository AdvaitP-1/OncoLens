from typing import Any


def round_floats(value: Any, digits: int = 6) -> Any:
    if isinstance(value, float):
        # Round aggressively so emitted JSON avoids scientific notation.
        return float(f"{value:.{digits}f}")
    if isinstance(value, list):
        return [round_floats(item, digits) for item in value]
    if isinstance(value, dict):
        return {k: round_floats(v, digits) for k, v in value.items()}
    return value
