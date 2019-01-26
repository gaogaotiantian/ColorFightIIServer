from .position import Position
import random

class MapCell:
    def __init__(self, position, attack_cost = 1):
        self.position = position
        self.attack_cost = random.randint(1,1000)
        self.gold = random.randint(1, 10)
        self.energy = random.randint(1, 10)
        self.owner = 0
        self.attacker_list = []

    def info(self):
        return {"position": self.position.info(), "attack_cost": self.attack_cost, "owner": self.owner}

class GameMap:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self._cells = self._generate_cells(width, height)
    
    def __getitem__(self, location):
        if isinstance(location, Position):
            return self._cells[location.y][location.x]
        elif isinstance(location, tuple):
            return self._cells[location[0]][location[1]]

    def __contains__(self, item):
        if isinstance(item, Position):
            return 0 <= item.x < self.width and 0 <= item.y < self.height
        elif isinstance(item, tuple):
            return 0 <= item[0] < self.width and 0 <= item[1] < self.height
        else:
            return False

    def get_random_empty_cell(self):
        empty_cells = [cell for cell in self._cells if cell.owner == 0]
        if not empty_cells:
            return None
        return random.choice(empty_cells)

    def born(self, user):
        cell = self.get_random_empty_cell()
        if cell == None:
            return False
        cell.owner = user.uid
        user.get_cell(cell)
        return True

    def update_cells(self):
        # This function updates all cells for a frame
        for x in range(self.width):
            for y in range(self.height):
                cell = self._cells[y][x]
                cell.update()

    def info(self):
        info = [[None for _ in range(self.width)] for _ in range(self.height)]
        for x in range(self.width):
            for y in range(self.height):
                info[y][x] = self._cells[y][x].info()
        return info

    def _generate_cells(self, width, height):
        cells = [[None for _ in range(width)] for _ in range(height)]
        for x in range(width):
            for y in range(height):
                cells[y][x] = MapCell(Position(x, y))
        return cells


