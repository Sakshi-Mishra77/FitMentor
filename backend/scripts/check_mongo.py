import asyncio
from backend.app.core import database

async def main():
    try:
        client = database.client
        dbs = await client.list_database_names()
        print('Databases:', dbs)
    except Exception as e:
        print('Error connecting to MongoDB:', e)

if __name__ == '__main__':
    asyncio.run(main())
