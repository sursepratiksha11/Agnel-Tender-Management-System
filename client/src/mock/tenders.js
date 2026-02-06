// Mock tender data
export const mockTenders = [
  {
    id: "t1",
    title: "Municipal Road Maintenance 2026",
    status: "published",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    bidsReceived: 3,
  },
  {
    id: "t2",
    title: "City Park Renovation",
    status: "draft",
    bidsReceived: 0,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
  },
  {
    id: "t3",
    title: "School IT Infrastructure Upgrade",
    status: "published",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(),
    bidsReceived: 1,
  },
];
