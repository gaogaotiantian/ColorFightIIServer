class User:
    def __init__(self, uid, username, password):
        self.uid = uid
        self.username = username
        self.password = password
        self.energy   = 1000
        self.gold     = 0
        self.energy_source = 0
        self.gold_source = 0
        self.tech_level = 1
        self.tax_level = 0
        self.dead = False
        self.cells = {}
        self.cmd_list = []

    def get_cell(self, cell):
        self.cells[cell.position] = cell
        self.energy_source += cell.energy
        self.gold_source   += cell.gold

    def update(self):
        self.tax_level = int(len(self.cells) / 100)
        self.energy += int((1 - self.tax_level * 0.1) * self.energy_source)
        self.gold   += int((1 - self.tax_level * 0.1) * self.gold_source)
        if len(self.cells) == 0:
            self.dead = True

    def info(self):
        return {"uid":self.uid, \
                "username": self.username, \
                "energy": self.energy, \
                "gold": self.gold, \
                "dead": self.dead, \
                "energy_source": self.energy_source, \
                "gold_source": self.gold_source, \
                "tech_level": self.tech_level, \
                "tax_level": self.tax_level, \
                "cells": [cell.position.info() for cell in self.cells.values()]}
