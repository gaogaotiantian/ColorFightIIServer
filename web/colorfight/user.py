class User:
    def __init__(self, uid, username, password):
        self.uid = uid
        self.username = username
        self.password = password
        self.verified = False
        self.energy   = 1000
        self.gold     = 0
        self.energy_source = 0
        self.gold_source = 0
        self.tech_level = 1
        self.tax_level = 0
        self.tax_amount = 0
        self.ranking = 0
        self.building_home = True
        self.building_number = {}
        self.dead = False
        self.cells = {}
        self.cmd_list = []

    def get_cell(self, cell):
        self.cells[cell.position] = cell
        self.energy_source += cell.energy
        self.gold_source   += cell.gold

    def update(self):
        def get_tax(num):
            tax = 0
            curr_coeff = 0
            while num >= 75:
                num -= 75
                tax += curr_coeff * 75
                curr_coeff += 1
            tax += num * curr_coeff
            return tax
        self.building_home = False
        cell_count = len(self.cells)
        building_count = self.building_number.get("energy_well", 0) + self.building_number.get("gold_mine", 0)
        self.tax_level = int(len(self.cells) / 100)
        self.tax_amount = get_tax(cell_count) + get_tax(building_count)
        self.energy += self.energy_source - self.tax_amount
        self.gold   += self.gold_source   - self.tax_amount
        if len(self.cells) == 0:
            self.dead = True

    def info(self):
        return {"uid":self.uid, \
                "username": self.username, \
                "verified": self.verified, \
                "ranking" : self.ranking, \
                "energy": self.energy, \
                "gold": self.gold, \
                "dead": self.dead, \
                "energy_source": self.energy_source, \
                "gold_source": self.gold_source, \
                "tech_level": self.tech_level, \
                "tax_level": self.tax_level, \
                "tax_amount": self.tax_amount, \
                "building_number": self.building_number, \
                "cell_number": len(self.cells), \
                "cells": [cell.position.info() for cell in self.cells.values()]}
