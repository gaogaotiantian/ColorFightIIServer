import json
import os

import firebase_admin
from firebase_admin import credentials
from firebase_admin import storage

cred_json = json.loads(os.getenv('FIREBASE_CONFIG', None))
class FireBase:
    def __init__(self):
        credential = credentials.Certificate(cred_json)
        app = firebase_admin.initialize_app(credential, {
            'storageBucket': 'colorfightai-firebase.appspot.com'
        })

        bucket = storage.bucket()
        blob = bucket.blob('testfile.txt')
        blob.upload_from_string('123')


if __name__ == '__main__':
    f = FireBase()
