# OpsCore HR

> A centralized HR & Business Operations platform that automates employee 
> lifecycle management, departmental workflows, and operational KPI reporting.

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-teal?logo=tailwindcss)

## 🚀 Live Demo
**[View Live App](https://opscore-hr.vercel.app/login)** ← Update after deployment
Test Username - admin@opscore.com
Test Password - Admin@123

## 🧠 About

OpsCore HR is a full-stack business 
operations platform. It automates core HR workflows — managing employee records, 
department assignments, role-based access control, and delivers live operational 
KPIs to management on demand.

Originally architected with **Java, Spring Boot, and MySQL**, this is a modern 
rebuild using React, TypeScript, and Supabase.



## ✨ Features

- 🔐 **Role-Based Access Control** — Admin, Manager, Employee roles
- 👥 **Employee Management** — Full CRUD with search, filter, pagination
- 🏢 **Department & Designation Management**
- 📊 **Live KPI Dashboard** — Headcount, role distribution, dept performance
- 📈 **Reports** — Filtering, sorting, CSV export across 5 report types
- 📋 **Real-time Activity Log** — Audit trail for all system actions
- 🌙 **Dark / Light Mode**
- 📱 **Fully Responsive**

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend & DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Recharts |
| Deployment | Vercel |

## ⚙️ Local Setup

1. **Clone the repo**
```bash
git clone https://github.com/nithinveeranki/opscore-hr.git
cd opscore-hr
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env.local`** in root folder
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run migrations** — paste files from `supabase/migrations/` 
   into Supabase SQL Editor and run in order

5. **Start dev server**
```bash
npm run dev
```

## 👤 Author

**Nithin Veeranki**
- 🐙 GitHub: [@nithinveeranki](https://github.com/nithinveeranki)
- 💼 LinkedIn: [linkedin.com/in/nithinveeranki](https://linkedin.com/in/nithinveeranki)

## 📄 License
MIT License
