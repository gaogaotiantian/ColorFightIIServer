import sys
import json
import os
import time
import concurrent.futures
import asyncio

import firebase_admin
from firebase_admin import credentials
import time
from firebase_admin import storage, firestore, db
import trueskill


class Firebase:
    def __init__(self):
        try:
            cred_json = json.loads(os.getenv('FIREBASE_CREDENTIALS', None))
            cred_json['private_key'] = cred_json['private_key'].replace('\\n', '\n')
            credential = credentials.Certificate(cred_json)
            app = firebase_admin.initialize_app(credential, {
                'projectId'    : 'colorfightai-firebase',
                'storageBucket': 'colorfightai-firebase.appspot.com',
                'databaseURL'  : 'https://colorfightai-firebase.firebaseio.com'
            })

            self.executor = concurrent.futures.ThreadPoolExecutor(max_workers = 15)

            self.bucket    = storage.bucket()
            self.firestore = firestore.client()
            self.db        = db

            self.leaderboard_duration = 5 * 24 * 3600
            self.valid = True
        except Exception as e:
            self.valid = False
            print(e)
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

    def leaderboard_set_score(self, user, school, score):
        if self.valid:
            ref = self.db.reference('/leaderboard')
            child = ref.child(user)
            count = child.get().get("count", 0) + 1
            child.set({"score":score, "school":school, "timestamp":int(time.time()), "count":count})

    async def clean_leaderboard(self):
        if self.valid:
            ref = self.db.reference('/leaderboard')
            old_records = ref.order_by_child("timestamp")\
                    .end_at(time.time() - self.leaderboard_duration)\
                    .get()
            for key in old_records:
                ref.child(key).delete()

    async def backup_leaderboard(self, tag = str(int(time.time()))):
        if self.valid:
            ref     = self.db.reference('/leaderboard')
            records = ref.get()
            target_ref = self.db.reference('/leaderboard_backup/' + tag)
            for key in records:
                target_ref.child(key).set(records[key])

    async def reset_leaderboard(self, tag = str(int(time.time()))):
        if self.valid:
            if tag:
                await self.backup_leaderboard(tag = tag)
            ref     = self.db.reference('/leaderboard')
            records = ref.get()
            for key in records:
                ref.child(key).delete()
            batch = self.firestore.batch()
            records = self.firestore.collection('users').stream()
            for doc in records:
                batch.update(doc.reference, {"game_ranking_dev": 25/3, "game_ranking_mean":25, "game_ranking_count": 0})
            batch.commit()

    async def verify_user(self, username, password):
        def _check():
            result = self.firestore.collection('users')\
                    .where("game_username", "==", username)\
                    .where("game_password", "==", password)\
                    .limit(1)\
                    .stream()
            for data in result:
                return {"verified": True, "user_data": data.to_dict()}
            return {"verified": False, "user_data": None}

        if self.valid: 
            loop = asyncio.get_event_loop()
            future = asyncio.ensure_future(loop.run_in_executor(self.executor, _check))
            return await future
        return {"verified": False, "user_data": None}

    async def update_result(self, result):
        '''
        result should be a list of usernames, could be None, for unverified user
        '''
        def _get(username):
            if username:
                result = self.firestore.collection('users')\
                        .where("game_username", "==", username)\
                        .stream()
                for data in result:
                    return (data, data.to_dict(), {})
            return (None, None, {})

        def _set(users):
            # record matches
            match_result = {"users": [], "mean": [], "dev": []}
            batch = self.firestore.batch()
            for user in users:
                user_obj  = user[0]
                user_data = user[1]
                user_prev_data = user[2]
                if user[0]:
                    match_result["users"].append(user_data["game_username"])
                    match_result["mean"].append("({:.6}, {:.6})".format(user_prev_data["game_ranking_mean"], user_data["game_ranking_mean"]))
                    match_result["dev"].append("({:.6}, {:.6})".format(user_prev_data["game_ranking_dev"], user_data["game_ranking_dev"]))
                    ladder_score = user_data['game_ranking_mean'] - 3 * user_data['game_ranking_dev']
                    batch.update(user_obj.reference, user_data)
                    self.leaderboard_set_score(user_data["game_username"], user_data["school"], ladder_score)
                else:
                    match_result["users"].append("None")
                    match_result["mean"].append("(None, None)")
                    match_result["dev"].append("(None, None)")
            ref = self.db.reference('/match')
            ref.child(str(int(1000*time.time()))).set(match_result)
            batch.commit()

        loop = asyncio.get_event_loop()
        futures = []
        for user in result:
            future = asyncio.ensure_future(loop.run_in_executor(self.executor, _get, user))
            futures.append(future)

        users = await asyncio.gather(*futures) 

        env = trueskill.TrueSkill()
        rating_group = []
        for user in users:
            user_data = user[1]
            if user_data:
                user_rating = env.create_rating(mu    = user_data['game_ranking_mean'],
                                                sigma = user_data['game_ranking_dev'])
            else:
                user_rating = env.create_rating()
            rating_group.append((user_rating,))

        rating_group = env.rate(rating_group)
        for idx, user in enumerate(users):
            if user[1]:
                user[2]['game_ranking_mean'] = user[1]['game_ranking_mean']
                user[2]['game_ranking_dev'] = user[1]['game_ranking_dev']
                user[1]['game_ranking_mean'] = rating_group[idx][0].mu
                user[1]['game_ranking_dev']  = rating_group[idx][0].sigma

        asyncio.ensure_future(loop.run_in_executor(self.executor, _set, users))

    
if __name__ == '__main__':
    f = Firebase()
    print(time.time())
    loop = asyncio.get_event_loop()
    #f.upload_replay('test'*1000, {'info':{'game_id':10201020}, 'users':{1:{'username':'abc', 'gold':1000, 'energy':2000}}})

    asyncio.ensure_future(f.update_result(["Athena", "Chrysus"]))
    #asyncio.ensure_future(f.reset_leaderboard("test"))
    #f.leaderboard_set_score("Chrysus", "Ancient", 14.47)
    loop.run_forever()

