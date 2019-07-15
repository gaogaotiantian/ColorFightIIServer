from .position import Position
from .building import Home, Empty
from .util import clip
import random
import copy

class MapCell:
    def __init__(self, position, **kwargs):
        self.position = position
        self.natural_gold = random.randint(1, 10)
        self.natural_energy = random.randint(1, 10)
        self.natural_cost = int((self.natural_gold + self.natural_energy) * 20 * random.uniform(0.6, 1.5))
        for kw in kwargs:
            if hasattr(self, kw):
                setattr(self, kw, kwargs[kw])
        self.clear()
    
    def clear(self):
        self.building = Empty()
        self.owner = 0
        self.force_field = 0
        self.attacker_list = []

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

    @property
    def adjacent_forcefield_incr(self):
        return self.building.adjacent_forcefield_incr

    @property
    def adjacent_forcefield_decr(self):
        return self.building.adjacent_forcefield_decr

    @property
    def self_forcefield_incr(self):
        return self.building.self_forcefield_incr

    def attack(self, uid, energy):
        self.attacker_list.append((uid, energy))

    def upgrade(self):
        self.building.upgrade()

    def update(self, users):
        if self.building.is_home:
            self.building.stored_energy = users[self.owner].energy
        # Change owner based on attacker list
        if self.attacker_list:
            max_id, max_energy = max(self.attacker_list, key = lambda x: x[1])
            total_energy = sum([x[1] for x in self.attacker_list])
            equivalent_energy = max_energy * 2 - total_energy 
            if equivalent_energy >= self.attack_cost:
                self.force_field = 2*(equivalent_energy - self.attack_cost)
                if self.owner != max_id:
                    # this cell changed owner. Do the callback 
                    self.building.taken(self, users, self.owner, max_id)
                self.force_field = min(1000, self.force_field)
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
    def __init__(self, width, height, max_player, symmetric = True):
        self.width = width
        self.height = height
        self.symmetric = symmetric
        self.symmetric_born_position = self._generate_symmetric_born_position(max_player)
        self._cells = self._generate_cells(width, height)
    
    def __getitem__(self, location):
        if isinstance(location, tuple):
            return self._cells[location[1]][location[0]]
        elif isinstance(location, Position):
            return self._cells[location.y][location.x]

    def __contains__(self, item):
        if isinstance(item, Position):
            return 0 <= item.x < self.width and 0 <= item.y < self.height
        elif isinstance(item, tuple):
            return 0 <= item[0] < self.width and 0 <= item[1] < self.height
        else:
            return False

    def _generate_symmetric_born_position(self, max_player):
        x = random.randrange(1, self.width // 2)
        y = random.randrange(0, x)
        ret = [
                Position(x, y),
                Position(self.width - 1 - x, self.height - 1 - y),
                Position(self.height - 1 - y, x),
                Position(y, self.width - 1 - x),
                Position(y, x),
                Position(self.width - 1 - x, y),
                Position(x, self.height - 1 - y),
                Position(self.height - 1 - y, self.width - 1 - x),
        ]
        ret = ret[:max_player]
        random.shuffle(ret)
        return ret

    def get_cells(self):
        return [self._cells[y][x] for y in range(self.height) for x in range(self.width)]

    def get_random_empty_cell(self):
        empty_cells = [cell for cell in self.get_cells() if cell.owner == 0]
        if not empty_cells:
            return None
        return random.choice(empty_cells)

    def get_symmetric_born_cell(self):
        for p in self.symmetric_born_position:
            if self[p].owner == 0:
                return self[p]
        return None

    def born(self, user):
        if self.symmetric:
            cell = self.get_symmetric_born_cell()
        else:
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
                cell.update(users)
                uid = cell.owner
                if uid in users:
                    user = users[uid]
                    user.cells[cell.position] = cell
                    user.gold_source += cell.gold
                    user.energy_source += cell.energy
                    # Update tech_level
                    if cell.building.is_home and cell.building.level > user.tech_level:
                        user.tech_level = cell.building.level
                    # Update building number
                    if not cell.building.is_empty:
                        user.building_number[cell.building.name] = \
                                user.building_number.get(cell.building.name, 0) + 1
                else:
                    if cell.owner != 0:
                        print(cell.owner)
                    cell.owner = 0

        # If the user's home is destroyed, clear the buildings
        for user in users.values():
            if user.tech_level == 0:
                for cell in user.cells.values():
                    if not cell.building.is_home:
                        cell.building = Empty()

        # After updating the owner, we update the force field
        for x in range(self.width):
            for y in range(self.height):
                cell = self._cells[y][x]
                if cell.owner != 0:
                    for pos in cell.position.get_surrounding_cardinals_tuple():
                        otherCell = self[pos]
                        if otherCell.owner != 0:
                            if otherCell.owner != cell.owner:
                                cell.force_field -= otherCell.adjacent_forcefield_decr
                            else:
                                cell.force_field += otherCell.adjacent_forcefield_incr
                    cell.force_field += cell.self_forcefield_incr
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

    def _cast_to_original_coord(self, x, y):
        if x >= self.width / 2:
            x = self.width - 1 - x
        if y >= self.height / 2:
            y = self.height - 1 - y
        if y > x:
            x, y = y, x
        return x, y

    def _generate_cells(self, width, height):
        cells = [[None for _ in range(width)] for _ in range(height)]
        if not self.symmetric:
            for x in range(width):
                for y in range(height):
                    cells[y][x] = MapCell(Position(x, y))
            for _ in range(3):
                cells = self._blur(cells, percent = 0.05)
        else:
            # generate a 1/8 slice first
            for x in range((width+1) // 2):
                for y in range(x+1):
                    cells[y][x] = MapCell(Position(x, y))
            for x in range(width):
                for y in range(height):
                    if cells[y][x] == None:
                        orig_x, orig_y = self._cast_to_original_coord(x, y)
                        cells[y][x] = copy.copy(cells[orig_y][orig_x])
                        cells[y][x].position = Position(x, y)
                        # attack list is the only thing that may be conflict 
                        # with shallow copy
                        cells[y][x].attacker_list = []
            for _ in range(3):
                cells = self._blur(cells, percent = 0.05)

        return cells

    def _copy_cells(self, cells):
        height = len(cells)
        width = len(cells[0])
        ret = [[None for _ in range(width)] for _ in range(height)]
        for x in range(width):
            for y in range(height):
                ret[y][x] = copy.copy(cells[y][x])
        return ret

