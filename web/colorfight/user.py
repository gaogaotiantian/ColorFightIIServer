class User:
    def __init__(self, username, password):
        self.uid = uid
        self.username = username
        self.password = password
        self.energy   = 10
        self.cells = []

    def get_cell(self, cell):
        self.cells.append(cell)

    def info(self):
        return {"uid":self.uid, "username": self.username, "energy":self.energy}
