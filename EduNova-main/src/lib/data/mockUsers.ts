export interface MockUser {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  totalPurchases: number;
  status: "active" | "blocked";
  role: "user" | "admin" | "owner";
}

export const mockUsers: MockUser[] = [];

let users = [...mockUsers];

export const getAllUsers = () => users;
export const blockUser = (id: string) => {
  users = users.map(u => u.id === id ? { ...u, status: "blocked" } : u);
};
export const unblockUser = (id: string) => {
  users = users.map(u => u.id === id ? { ...u, status: "active" } : u);
};
export const deleteUser = (id: string) => {
  users = users.filter(u => u.id !== id);
};
