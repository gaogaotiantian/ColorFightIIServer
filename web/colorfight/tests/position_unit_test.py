from ..position import Position, Direction
from ..constants import GAME_WIDTH, GAME_HEIGHT

def test_position(capsys):
    assert(Position(1, 2) == Position(1, 2))
    assert(Position(1, 2) != Position(2, 1))
    assert(Position(1, 2) + Position(2, 1) == Position(3, 3))
    assert(Position(3, 3) - Position(2, 1) == Position(1, 2))
    p = Position(3, 3)
    p -= Position(1, 2)
    assert(p == Position(2, 1))
    p = Position(3, 3)
    p += Position(1, 2)
    assert(p == Position(4, 5))

    print(Position(1, 2))
    captured = capsys.readouterr()
    assert(captured.out == "Position(1, 2)\n")

def test_position_direction():
    assert(Position(1, 2).directional_offset(Direction.North) == Position(1, 1))
    surr = Position(0, 1).get_surrounding_cardinals()
    assert set(surr) == set([Position(0, 0), Position(1, 1), Position(0, 2)])
    surr = Position(GAME_WIDTH - 1, 0).get_surrounding_cardinals_tuple()
    assert set(surr) == set([(GAME_WIDTH - 1, 1), (GAME_WIDTH - 2, 0)])
