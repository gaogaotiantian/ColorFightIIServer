from ..game_map import GameMap

def test_game_map_basic():
    m = GameMap(30, 30)
    assert((0, 0) in m and (29, 29) in m and (0, -1) not in m and (2, 30) not in m)
    assert(len(m.get_cells()) == 900)
