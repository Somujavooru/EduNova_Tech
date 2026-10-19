export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  joinedAt: string;
  status: "active" | "blocked";
  totalOrders: number;
  totalSpent: number;
}

export interface MockSeller {
  id: string;
  name: string;
  email: string;
  projectsUploaded: number;
  totalSales: number;
  revenue: number;
  joinedAt: string;
  status: "active" | "blocked";
}

export const mockUsers: MockUser[] = [];

export const mockSellers: MockSeller[] = [];

// Category sales data for analytics
export const categorySalesData = [
  { category: "Web Development", sales: 245, revenue: 490000 },
  { category: "AI/ML", sales: 189, revenue: 567000 },
  { category: "IoT", sales: 134, revenue: 201000 },
  { category: "Mobile Apps", sales: 112, revenue: 358000 },
  { category: "Hardware", sales: 98, revenue: 88200 },
  { category: "Cybersecurity", sales: 67, revenue: 80400 },
  { category: "Robotics", sales: 45, revenue: 135000 },
  { category: "Cloud", sales: 38, revenue: 114000 },
];

// Monthly sales data
export const monthlySalesData = [
  { month: "Jan", sales: 42, revenue: 63000 },
  { month: "Feb", sales: 58, revenue: 87000 },
  { month: "Mar", sales: 71, revenue: 106500 },
  { month: "Apr", sales: 95, revenue: 142500 },
  { month: "May", sales: 128, revenue: 192000 },
  { month: "Jun", sales: 156, revenue: 234000 },
];
