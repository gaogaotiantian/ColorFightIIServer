from .position import Position
from .building import Home, Empty
from .util import clip
import random
import copy

class MapCell:
    def __init__(self, position, **kwargs):
        self.position = position
        self.building = Empty()
        self.natural_gold = random.randint(1, 10)
        self.natural_energy = random.randint(1, 10)
        self.owner = 0
        self.natural_cost = int((self.natural_gold + self.natural_energy) * 15 * random.uniform(0.6, 1.5))
        self.force_field  = 0
        self.attacker_list = []
        for kw in kwargs:
            if hasattr(self, kw):
                setattr(self, kw, kwargs[kw])
    @property
    def attack_cost(self):
        return self.building.get_attack_cost(self)

    @property
    def energy(self):
        return self.building.get_energy(self)

    @property
    def gold(self):
        return self.building.get_gold(self)

    @property
    def is_home(self):
        return self.building.is_home

    @property
    def is_empty(self):
        return self.building.is_empty

    def attack(self, uid, energy):
        self.attacker_list.append((uid, energy))

    def upgrade(self):
        self.building.upgrade()

    def update(self):
        # Change owner based on attacker list
        if self.attacker_list:
            max_id, max_energy = max(self.attacker_list, key = lambda x: x[1])
            total_energy = sum([x[1] for x in self.attacker_list])
            equivalent_energy = max_energy * 2 - total_energy 
            if equivalent_energy >= self.attack_cost:
                self.force_field = int(min(1000, 2*(equivalent_energy - self.attack_cost)))
                if self.owner != max_id:
                    self.building = Empty()
                self.owner = max_id
            self.attacker_list = []

    def info(self):
        return {"position": self.position.info(), \
                "building": self.building.info(), \
                "attack_cost": self.attack_cost, \
                "owner": self.owner, \
                "gold": self.gold, \
                "energy": self.energy, \
                "natural_gold": self.natural_gold, \
                "natural_energy": self.natural_energy, \
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
            return self._cells[location[1]][location[0]]

    def __contains__(self, item):
        if isinstance(item, Position):
            return 0 <= item.x < self.width and 0 <= item.y < self.height
        elif isinstance(item, tuple):
            return 0 <= item[0] < self.width and 0 <= item[1] < self.height
        else:
            return False

    def get_cells(self):
        return [self._cells[y][x] for y in range(self.height) for x in range(self.width)]

    def get_random_empty_cell(self):
        empty_cells = [cell for cell in self.get_cells() if cell.owner == 0]
        if not empty_cells:
            return None
        return random.choice(empty_cells)

    def born(self, user):
        cell = self.get_random_empty_cell()
        if cell == None:
            return False
        cell.building = Home()
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
            user.tech_level = 0
            user.building_number = {}

        for x in range(self.width):
            for y in range(self.height):
                cell = self._cells[y][x]
                cell.update()
                uid = cell.owner
                if uid in users:
                    users[uid].cells[cell.position] = cell
                    users[uid].gold_source += cell.gold
                    users[uid].energy_source += cell.energy
                    # Update tech_level
                    if cell.is_home and cell.building.level > users[uid].tech_level:
                        users[uid].tech_level = cell.building.level
                    # Update building number
                    if not cell.is_empty:
                        users[uid].building_number[cell.building.name] = \
                                users[uid].building_number.get(cell.building.name, 0) + 1
                else:
                    if cell.owner != 0:
                        print(cell.owner)
                    cell.owner = 0

        # After updating the owner, we update the force field
        for x in range(self.width):
            for y in range(self.height):
                cell = self._cells[y][x]
                surrounding_enemy_number = 0
                surrounding_self_number  = 0
                for pos in cell.position.get_surrounding_cardinals():
                    if self[pos].owner != 0:
                        if self[pos].owner != cell.owner:
                            surrounding_enemy_number += 1
                        else:
                            surrounding_self_number  += 1
                cell.force_field += surrounding_self_number * 5 
                cell.force_field -= surrounding_enemy_number * 30
                cell.force_field += cell.building.get_force_field_increase(cell)
                cell.force_field  = clip(cell.force_field, 0, 1000)

    def info(self):
        info = [[None for _ in range(self.width)] for _ in range(self.height)]
        for x in range(self.width):
            for y in range(self.height):
                info[y][x] = self._cells[y][x].info()
        return info

    def _blur(self, cells, percent = 0.15):
        new_cells = self._copy_cells(cells)

        for x in range(self.width):
            for y in range(self.height):
                cell = new_cells[y][x]
                cell.natural_cost = cells[y][x].natural_cost
                count = 0
                for pos in cell.position.get_surrounding_cardinals():
                    count += 1
                    new_cells[y][x].natural_cost += int(cells[pos.y][pos.x].natural_cost * percent)
                cell.natural_cost -= int(cells[y][x].natural_cost * count * percent)
        
        return new_cells

    def _generate_cells(self, width, height):
        cells = [[None for _ in range(width)] for _ in range(height)]
        for x in range(width):
            for y in range(height):
                cells[y][x] = MapCell(Position(x, y))
        for i in range(3):
            cells = self._blur(cells, percent = 0.05)
        return cells

    def _copy_cells(self, cells):
        height = len(cells)
        width = len(cells[0])
        ret = [[None for _ in range(width)] for _ in range(height)]
        for x in range(width):
            for y in range(height):
                ret[y][x] = copy.deepcopy(cells[y][x])
        return ret

