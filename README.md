# Quest4Deals
Welcome to Our Senior Project Repository!

This repository contains the full source code and related files for our senior capstone project, a web application designed to help gamers stay informed about the best deals on their favorite games.

Our goal was to create a user-friendly platform where users can build a personalized watchlist of games and receive real-time notifications whenever those games go on sale across popular retailers. By aggregating data from trusted game marketplaces, our site helps users save money and never miss out on a great deal.

### Features:
- Create an account and log in securely

- Add games to your personal watchlist

- Automatically receive alerts when tracked games drop in price

- View historical pricing trends and retailer comparisons

- Intuitive and responsive user interface built with React and TypeScript

- Backend built with ASP.NET Core Web API for secure and efficient data handling

### Inside This Repository:
- client/ – Frontend source code (React + TypeScript)

- server/ – Backend source code (ASP.NET Core Web API)

- README.md – Project overview and installation guide

This project reflects our efforts in full-stack development, API integration, cloud deployment, and user-centered design. We hope you find it useful or inspiring


## How to Run the Project Locally

This project includes:

- A **React + Vite frontend** (`quest4dealsweb.client`)
- An **ASP.NET Core Web API backend** (`quest4dealsweb.Server`)

Both run together using a single command: `dotnet run`.

---

### Prerequisites

Ensure the following tools are installed:

- [.NET 8.0 SDK or later](https://dotnet.microsoft.com/download)
- [Node.js (v18+ recommended)](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- SQL Server or compatible database engine

---

### Running the Application

**Clone the repository and navigate to the solution folder:**

```bash
git clone https://github.com/Oscar-Ruelas/Quest4Deals.git
cd quest4dealsweb.Server
```

**Restore backend and frontend dependencies:**

```bash
dotnet restore
```

**Run the app:**

```bash
dotnet run
```
This will:
- Start the ASP.NET Core Web API on https://localhost:5001
- Automatically run npm install (if needed)
- Launch the Vite dev server via npm run dev
- Proxy frontend requests to the backend

Open the app in your browser at:
```bash
https://localhost:51540/
```
