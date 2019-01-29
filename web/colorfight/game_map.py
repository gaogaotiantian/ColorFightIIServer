from .constants import GAME_WIDTH, GAME_HEIGHT
from .position import Position
import random

class MapCell:
    def __init__(self, position):
        self.position = position
        self.is_home  = False
        self.building = "empty"
        self.gold = random.randint(1, 10)
        self.energy = random.randint(1, 10)
        self.owner = 0
        self.natural_cost = random.randint(1, 100)
        self.force_field  = 0
        self.attacker_list = []

    @property
    def attack_cost(self):
        return int(self.natural_cost + self.force_field)

    def attack(self, uid, energy):
        self.attacker_list.append((uid, energy))

    def update(self):
        # Change owner based on attacker list
        if self.attacker_list:
            max_energy = 0
            max_id = []
            for attacker_id, attacker_energy in self.attacker_list:
                if attacker_energy > max_energy:
                    max_id = [attacker_id]
                    max_energy = attacker_energy
                elif attacker_energy == max_energy:
                    max_id += [attacker_id]
            if len(max_id) == 1:
                # Attack will be successful if only one player is the max
                self.force_field = int(min(1000, attacker_energy*2))
                if self.owner != max_id[0]:
                    self.building = "empty"
                    self.is_home = False
                self.owner = max_id[0]
                self.attacker_list = []

    def info(self):
        return {"position": self.position.info(), \
                "building": self.building, \
                "attack_cost": self.attack_cost, \
                "owner": self.owner, \
                "gold": self.gold, \
                "energy": self.energy, \
                "natural_cost": self.natural_cost, \
                "force_field": self.force_field}

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

    def get_cells(self):
        return [self._cells[y][x] for y in range(GAME_HEIGHT) for x in range(GAME_WIDTH)]

    def get_random_empty_cell(self):
        empty_cells = [cell for cell in self.get_cells() if cell.owner == 0]
        if not empty_cells:
            return None
        return random.choice(empty_cells)

    def born(self, user):
        cell = self.get_random_empty_cell()
        if cell == None:
            return False
        cell.energy = 10
        cell.gold = 10
        cell.natural_cost = 1000
        cell.is_home = True
        cell.building = "home"
        cell.owner = user.uid
        user.get_cell(cell)
        return True

    def update_cells(self, users):
        # This function updates all cells for a frame
        # Also update the user info based on updated cells

        # Clear user data first
        for user in users.values():
            user.cells = {}
            user.energy_source = 0
            user.gold_source = 0

        for x in range(self.width):
            for y in range(self.height):
                cell = self._cells[y][x]
                cell.update()
                uid = cell.owner
                if uid in users:
                    users[uid].cells[cell.position] = cell
                    users[uid].gold_source += cell.gold
                    users[uid].energy_source += cell.energy
                else:
                    cell.owner = 0
        # After updating the owner, we update the force field
        for x in range(self.width):
            for y in range(self.height):
                cell = self._cells[y][x]
                surrounding_enemy_number = 0
                for pos in cell.position.valid_surrounding_cardinals():
                    if self[pos].owner != 0 and self[pos].owner != cell.owner:
                        surrounding_enemy_number += 1
                cell.force_field -= int(cell.force_field * (0.05 * surrounding_enemy_number))

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


