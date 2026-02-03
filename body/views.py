import random
from copy import deepcopy

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

BOARD_SIZE = 100
SNAKES = {
    16: 6,
    48: 30,
    62: 19,
    88: 24,
    95: 56,
    97: 78,
}
LADDERS = {
    2: 38,
    7: 14,
    8: 31,
    15: 26,
    21: 42,
    28: 84,
    36: 44,
    51: 67,
    71: 91,
    78: 98,
    87: 94,
}


def _new_state():
    """Fresh game state; keep it JSON serialisable for the session backend."""
    return {
        "positions": [1, 1],  # Player 1 and Player 2 start on square 1
        "turn": 0,  # index of current player
        "winner": None,
    }


def _get_state(request):
    state = request.session.get("state")
    if not state or "positions" not in state:
        state = _new_state()
        request.session["state"] = deepcopy(state)
    return state


def board(request):
    state = _get_state(request)
    # Squares laid out 1..100 for template rendering
    squares = list(range(1, BOARD_SIZE + 1))
    context = {
        "state": state,
        "squares": squares,
        "snakes": SNAKES,
        "ladders": LADDERS,
    }
    return render(request, "body/board.html", context)


@require_POST
def roll(request):
    state = _get_state(request)
    if state.get("winner") is not None:
        return JsonResponse(
            {"error": "Game already finished", "winner": state["winner"]}, status=400
        )

    current_player = state["turn"]
    roll_value = random.randint(1, 6)
    starting_pos = state["positions"][current_player]
    tentative = starting_pos + roll_value
    bounced = False

    if tentative > BOARD_SIZE:
        tentative = starting_pos  # overshoot keeps you in place
        bounced = True

    event = None
    landing = tentative
    if landing in LADDERS:
        landing = LADDERS[landing]
        event = "ladder"
    elif landing in SNAKES:
        landing = SNAKES[landing]
        event = "snake"

    state["positions"][current_player] = landing

    winner = None
    if landing == BOARD_SIZE:
        winner = current_player
        state["winner"] = winner
    else:
        # Roll of 6 earns another turn; otherwise pass play
        if roll_value != 6:
            state["turn"] = 1 - current_player

    request.session["state"] = deepcopy(state)
    request.session.modified = True

    payload = {
        "roll": roll_value,
        "positions": state["positions"],
        "turn": state["turn"],
        "event": event,
        "winner": winner,
        "bounced": bounced,
        "currentPlayer": current_player,
        "landing": landing,
    }
    return JsonResponse(payload)


@require_POST
def reset_game(request):
    state = _new_state()
    request.session["state"] = deepcopy(state)
    request.session.modified = True
    return JsonResponse({"status": "reset", "state": state})
