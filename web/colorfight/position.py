from .constants import GAME_WIDTH, GAME_HEIGHT
class Direction:
    North = (0, -1)
    South = (0, 1)
    West  = (-1, 0)
    East  = (1, 0)

    @staticmethod
    def get_all_cardinals():
        return [Direction.North, Direction.South, Direction.West, Direction.East]


class Position:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return hash((self.x, self.y))

    def __add__(self, other):
        return Position(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Position(self.x - other.x, self.y - other.y)

    def __iadd__(self, other):
        self.x += other.x
        self.y += other.y
        return self

    def __isub__(self, other):
        self.x -= other.x
        self.y -= other.y
        return self

    def is_valid(self):
        return 0 <= self.x < GAME_WIDTH and 0 <= self.y < GAME_HEIGHT

    def __repr__(self):
        return "Position({}, {})".format(self.x, self.y)

    def directional_offset(self, direction):
        return self + Position(*direction)

    def get_surrounding_cardinals(self):
        return [self.directional_offset(d) for d in Direction.get_all_cardinals()]

    def valid_surrounding_cardinals(self):
        return [position for position in self.get_surrounding_cardinals() if position.is_valid()]

    def info(self):
        return (self.x, self.y)
