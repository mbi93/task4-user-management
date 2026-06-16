import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Users() {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const loadUsers = async () => {
    try {
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  const handleSelect = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
  };

  const handleBlock = async () => {
    try {
      await api.post("/users/block", {
        userIds: selectedUsers,
      });

      setMessage("Users blocked successfully");

      setUsers((prev) =>
        prev.map((user) =>
          selectedUsers.includes(user.id)
            ? { ...user, status: "blocked" }
            : user
        )
      );

      clearSelection();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUnblock = async () => {
    try {
      await api.post("/users/unblock", {
        userIds: selectedUsers,
      });

      setMessage("Users unblocked successfully");

      setUsers((prev) =>
        prev.map((user) =>
          selectedUsers.includes(user.id)
            ? { ...user, status: "unverified" }
            : user
        )
      );

      clearSelection();
    } catch (error) {
      console.error(error);
    }
  };

const handleDelete = async () => {
  try {
    const token = localStorage.getItem("token");

    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    const currentUserId = payload.userId;

    const deletingSelf =
      selectedUsers.includes(currentUserId);

    await api.delete("/users", {
      data: {
        userIds: selectedUsers,
      },
    });

    if (deletingSelf) {
      localStorage.removeItem("token");
      navigate("/");
      return;
    }

    setMessage("Users deleted successfully");

    setUsers((prev) =>
      prev.filter(
        (user) => !selectedUsers.includes(user.id)
      )
    );

    clearSelection();
  } catch (error) {
    console.error(error);
  }
};
  const handleDeleteUnverified = async () => {
    try {
      await api.delete("/users/unverified");

      setMessage("Unverified users deleted");

      setUsers((prev) =>
        prev.filter(
          (user) => user.status !== "unverified"
        )
      );

      clearSelection();
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <h2>Users</h2>

        <button
          className="btn btn-outline-dark"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      <div className="mb-3">
        <button
          className="btn btn-danger me-2"
          disabled={selectedUsers.length === 0}
          onClick={handleBlock}
        >
          Block
        </button>

        <button
          className="btn btn-success me-2"
          disabled={selectedUsers.length === 0}
          onClick={handleUnblock}
        >
          Unblock
        </button>

        <button
          className="btn btn-warning me-2"
          disabled={selectedUsers.length === 0}
          onClick={handleDelete}
        >
          Delete
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleDeleteUnverified}
        >
          Delete Unverified
        </button>
      </div>

      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={
                  users.length > 0 &&
                  selectedUsers.length === users.length
                }
                onChange={handleSelectAll}
              />
            </th>

            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Last Login</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleSelect(user.id)}
                />
              </td>

              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.status}</td>

              <td>
                {user.lastLogin
                  ? new Date(
                      user.lastLogin
                    ).toLocaleString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Users;