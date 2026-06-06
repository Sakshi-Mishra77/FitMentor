import pymongo
from pymongo import MongoClient

hosts = ['localhost', '127.0.0.1']
for host in hosts:
    print('Testing host:', host)
    for mech in [None, 'SCRAM-SHA-256', 'SCRAM-SHA-1']:
        try:
            if mech:
                print(f'  Trying authMechanism={mech}')
                client = MongoClient(host, 27017, username='admin', password='supersecretpassword', authSource='admin', authMechanism=mech, serverSelectionTimeoutMS=5000)
            else:
                print('  Trying default mechanism')
                client = MongoClient(f'mongodb://admin:supersecretpassword@{host}:27017/?authSource=admin', serverSelectionTimeoutMS=5000)
            print('  Server info:', client.server_info()['version'])
            print('  Databases:', client.list_database_names())
        except Exception as e:
            print('  Failed with', mech, ':', e)
        finally:
            try:
                client.close()
            except:
                pass
