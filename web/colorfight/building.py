from .constants import BLD_ENERGY_WELL, BLD_GOLD_MINE

class BaseBuilding:
    cost = 0
    upgrade_cost = []
    def __init__(self):
        self.level = 1

    def get_energy(self, cell):
        return cell.natural_energy

    def get_gold(self, cell):
        return cell.natural_gold

    def get_attack_cost(self, cell):
        return int(cell.natural_cost + cell.force_field)

    def upgrade(self):
        self.level += 1

    @property
    def is_empty(self):
        return self.name == 'empty'

    @property
    def is_home(self):
        return self.name == 'home'

    @property
    def max_level(self):
        return len(self.upgrade_cost) + 1

    @property
    def upgrade_gold_cost(self):
        if self.level < self.max_level:
            return self.upgrade_cost[self.level - 1][0]
        return 0

    @property
    def upgrade_energy_cost(self):
        if self.level < self.max_level:
            return self.upgrade_cost[self.level - 1][1]
        return 0

    def info(self):
        return {'name': self.name, 'level': self.level}

class Empty(BaseBuilding):
    name = 'empty'

class Home(BaseBuilding):
    name = 'home'
    cost = 1000
    upgrade_cost = [(1000, 1000), (2000, 2000), (4000, 4000)]
    def get_energy(self, cell):
        return 10 * self.level

    def get_gold(self, cell):
        return 10 * self.level

    def get_attack_cost(self, cell):
        return 1000 * self.level

class EnergyWell(BaseBuilding):
    name = "energy_well"
    cost = 100
    upgrade_cost = [(200, 0), (400, 0), (800, 0)]

    def get_energy(self, cell):
        return cell.natural_energy * (1 + self.level)

class GoldMine(BaseBuilding):
    name = "gold_mine"
    cost = 100
    upgrade_cost = [(200, 0), (400, 0), (800, 0)]

    def get_gold(self, cell):
        return cell.natural_gold * (1 + self.level)

def get_building_class(building):
    '''
        return a class based on the string
    '''
    if building == BLD_ENERGY_WELL:
        return EnergyWell
    elif building == BLD_GOLD_MINE:
        return GoldMine
    else:
        return None
