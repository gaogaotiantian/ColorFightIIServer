class Chat:
    def __init__(self):
        self.chat = []

    def add(self, data):
        # data should be a dict: 
        # {"user": user, "msg": msg}
        if "user" in data and "msg" in data:
            self.chat.append(data)

    def get(self):
        ret = self.chat
        self.chat = []
        return ret

