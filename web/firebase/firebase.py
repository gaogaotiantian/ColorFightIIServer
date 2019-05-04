import sys
import json
import os
import concurrent.futures
import asyncio

import firebase_admin
from firebase_admin import credentials
import time
from firebase_admin import storage, firestore


class Firebase:
    def __init__(self):
        try:
            cred_json = json.loads(os.getenv('FIREBASE_CREDENTIALS', None))
            credential = credentials.Certificate(cred_json)
            app = firebase_admin.initialize_app(credential, {
                'projectId'    : 'colorfightai-firebase',
                'storageBucket': 'colorfightai-firebase.appspot.com'
            })

            self.executor = concurrent.futures.ThreadPoolExecutor(max_workers = 5)

            self.bucket = storage.bucket()
            self.firestore = firestore.client()
            self.valid = True
        except Exception as e:
            self.valid = False
            print("Could not connect to firebase, other stuff should work fine")

    def _upload_replay_data(self, data, game_id):
        blob = self.bucket.blob('replays/{}.cfr'.format(game_id))
        blob.upload_from_string(data, content_type="application/octet-stream")

    def _upload_replay_info(self, game_info):
        game_id = game_info['info']['game_id']
        users   = game_info['users']
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

    def upload_replay(self, replay, game_info):
        if self.valid:
            game_id = game_info['info']['game_id']
            loop = asyncio.get_event_loop()
            asyncio.ensure_future(loop.run_in_executor(self.executor, self._upload_replay_data, replay, game_id))
            asyncio.ensure_future(loop.run_in_executor(self.executor, self._upload_replay_info, game_info))

    
if __name__ == '__main__':
    f = Firebase()
    print(time.time())
    loop = asyncio.get_event_loop()
    f.upload_replay('test'*1000, {'info':{'game_id':10201020}, 'users':{1:{'username':'abc', 'gold':1000, 'energy':2000}}})
    loop.run_forever()
