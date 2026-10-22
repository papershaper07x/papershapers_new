import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from backend.app.database import Database


class PooledConnectionTests(unittest.TestCase):
    def test_timeout_and_query_share_transaction_then_commit(self):
        connection = MagicMock()
        with patch("psycopg.connect", return_value=connection) as connect:
            database = Database(Path("unused.sqlite"), "postgresql://runtime@localhost/test")
            with database.connect() as db:
                db.execute("SELECT ?", (1,))
            self.assertNotIn("options", connect.call_args.kwargs)
        self.assertEqual(connection.execute.call_args_list[0].args, ("SET LOCAL statement_timeout = '10s'",))
        self.assertEqual(connection.execute.call_args_list[1].args, ("SELECT %s", (1,)))
        connection.commit.assert_called_once()
        connection.rollback.assert_not_called()
        connection.close.assert_called_once()

    def test_timeout_failure_rolls_back_and_closes_without_running_operation(self):
        connection = MagicMock()
        connection.execute.side_effect = RuntimeError("timeout setup failed")
        with patch("psycopg.connect", return_value=connection):
            database = Database(Path("unused.sqlite"), "postgresql://runtime@localhost/test")
            with self.assertRaisesRegex(RuntimeError, "timeout setup failed"):
                with database.connect():
                    self.fail("operation must not run without the timeout")
        connection.commit.assert_not_called()
        connection.rollback.assert_called_once()
        connection.close.assert_called_once()
