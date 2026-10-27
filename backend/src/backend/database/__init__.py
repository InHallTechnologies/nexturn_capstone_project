from .collections import create_collections
from .indexes import create_indexes


def initialize_database():
    create_collections()
    create_indexes()


if __name__ == "__main__":
    initialize_database()
