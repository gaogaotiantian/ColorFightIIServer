import sys
import json
import os

import firebase_admin
from firebase_admin import credentials
import time
from firebase_admin import storage, firestore

cred_json = json.loads(os.getenv('FIREBASE_CREDENTIALS', None))
class Firebase:
    def __init__(self):
        credential = credentials.Certificate(cred_json)
        app = firebase_admin.initialize_app(credential, {
            'projectId'    : 'colorfightai-firebase',
            'storageBucket': 'colorfightai-firebase.appspot.com'
        })

        self.bucket = storage.bucket()
        self.firestore = firestore.client()

    def upload_replay(self, replay, game_info):
        game_id = game_info['info']['game_id']
        users   = game_info['users']

        blob = self.bucket.blob('replays/{}.cfr'.format(game_id))
        blob.upload_from_string(replay, content_type="application/octet-stream")

        ref = self.firestore.collection('replays').document(str(game_id))
        ref.set({
            'game_id': game_id,
            'timestamp': int(time.time()),
            'users': {
                str(uid): {
                    'username': users[uid]['username'], 
                    'gold'    : users[uid]['gold'],
                    'energy'  : users[uid]['energy']
                } for uid in users
            }
        })
    
if __name__ == '__main__':
    f = Firebase()
