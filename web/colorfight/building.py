from .constants import BLD_ENERGY_WELL, BLD_GOLD_MINE

class BaseBuilding:
    cost = 0
    def __init__(self):
        self.level = 1

    def get_energy(self, cell):
        return cell.natural_energy

    def get_gold(self, cell):
        return cell.natural_gold

    def get_attack_cost(self, cell):
        return int(cell.natural_cost + cell.force_field)

    def is_empty(self):
        return self.name == 'empty'

    def info(self):
        return self.name

class Empty(BaseBuilding):
    name = 'empty'

class Home(BaseBuilding):
    name = 'home'
    def get_energy(self, cell):
        return 10

    def get_gold(self, cell):
        return 10

    def get_attack_cost(self, cell):
        return 1000

class EnergyWell(BaseBuilding):
    name = "energy_well"
    cost = 100

    def get_energy(self, cell):
        return cell.natural_energy * 2

class GoldMine(BaseBuilding):
    name = "gold_mine"
    cost = 100

    def get_gold(self, cell):
        return cell.natural_gold * 2

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
