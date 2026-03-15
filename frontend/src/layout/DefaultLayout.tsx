import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { useCountNewServiceTickets } from "../service_tickets/useCountNewServiceTickets";
import { useProjectContext } from "../projects/ProjectContext";
import { useProjectRole } from "../projects/useProjectRole";
import ProjectSelector from "./ProjectSelector";
import { useCheckAdmin } from "../admins/useCheckAdmin";
import { useRevokeSession } from "../auth/useRevokeSession";
import { useUserSession } from "../auth/useUserSession";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Open sidebar by default on desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setSidebarOpen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const params = useParams();
  const { allProjects, selectedProjectId, setSelectedProjectId } =
    useProjectContext();
  const { logout } = useRevokeSession();
  const { getUser } = useUserSession();
  const currentUser = getUser();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleSignOut = async () => {
    await logout();
    window.location.href = "/login";
  };

  // Check if we're in a project context
  const projectId = params.projectId || params.id;
  const isInProject =
    location.pathname.includes("/projects/") &&
    projectId &&
    projectId !== "new";
  const projectIdNum = projectId ? parseInt(projectId) : 0;
  const routeProjectExists = allProjects.some(
    (project) => project.id === projectIdNum,
  );

  // Sync context when navigating to a project URL directly
  useEffect(() => {
    if (
      isInProject &&
      projectIdNum &&
      routeProjectExists &&
      projectIdNum !== selectedProjectId
    ) {
      setSelectedProjectId(projectIdNum);
    }
  }, [
    isInProject,
    projectIdNum,
    routeProjectExists,
    selectedProjectId,
    setSelectedProjectId,
  ]);

  // Get the count of new service tickets for the badge
  const { count: newTicketsCount } = useCountNewServiceTickets(projectIdNum);

  // Check if the current user is a system admin
  const { isAdmin } = useCheckAdmin();

  // Check the current user's project role
  const { canWrite } = useProjectRole(isInProject ? projectIdNum : null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 gap-2">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <Link to="/dashboard" className="flex items-center space-x-2">
              <img src="/pjeasy-logo.png" alt="PJEasy Logo" className="h-7" />
            </Link>
            {isInProject && (
              <>
                <div className="h-5 w-px bg-gray-300"></div>
                <div className="min-w-0 w-40 sm:w-56">
                  <ProjectSelector />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 hover:bg-indigo-200 transition-colors"
                >
                  {currentUser ? getInitials(currentUser.name) : "?"}
                </button>
                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                      {currentUser && (
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {currentUser.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {currentUser.loginId}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "left-0 md:w-56" : "-left-56 md:w-0"
          } fixed md:static md:left-0 top-12.25 bottom-0 z-30 w-56 bg-white border-r border-gray-200 transition-[left,width] duration-300 overflow-hidden`}
        >
          <nav className="p-3 space-y-1">
            {/* Project Menu - Show when in project context */}
            {isInProject && (
              <>
                <div className="px-3 py-1.5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Project Space
                  </div>
                </div>
                <Link
                  to={`/projects/${projectId}`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname === `/projects/${projectId}` ||
                    location.pathname === `/projects/${projectId}/dashboard`
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                  <span>Dashboard</span>
                </Link>
                <Link
                  to={`/projects/${projectId}/ideas`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname === `/projects/${projectId}/ideas`
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <span>Ideas</span>
                </Link>
                <Link
                  to={`/projects/${projectId}/issues`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname === `/projects/${projectId}/issues`
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>Issues</span>
                </Link>
                <Link
                  to={`/projects/${projectId}/features`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname === `/projects/${projectId}/features`
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <span>Features</span>
                </Link>
                <Link
                  to={`/projects/${projectId}/tasks`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname === `/projects/${projectId}/tasks`
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <span>Tasks</span>
                </Link>
                {canWrite && (
                  <>
                    <Link
                      to={`/projects/${projectId}/sprints`}
                      className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                        location.pathname.startsWith(
                          `/projects/${projectId}/sprints`,
                        )
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      } transition-colors`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Sprints</span>
                    </Link>
                    <Link
                      to={`/projects/${projectId}/reviews`}
                      className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                        location.pathname.startsWith(
                          `/projects/${projectId}/reviews`,
                        )
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      } transition-colors`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Reviews</span>
                    </Link>
                  </>
                )}
                <Link
                  to={`/projects/${projectId}/service-tickets`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname ===
                    `/projects/${projectId}/service-tickets`
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span className="flex-1">Service Tickets</span>
                  {newTicketsCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full"
                      title={`${newTicketsCount} new ticket(s) awaiting review`}
                    >
                      !
                    </span>
                  )}
                </Link>
                <Link
                  to={`/projects/${projectId}/wiki`}
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname.startsWith(`/projects/${projectId}/wiki`)
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <span>Wiki</span>
                </Link>
                {canWrite && (
                  <Link
                    to={`/projects/${projectId}/settings`}
                    className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                      location.pathname === `/projects/${projectId}/settings`
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    } transition-colors`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>Settings</span>
                  </Link>
                )}
                <div className="my-2 border-t border-gray-200"></div>
              </>
            )}

            {/* Admin Section - Only visible to system admins */}
            {isAdmin && (
              <>
                <div className="pt-3 pb-1">
                  <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </div>
                </div>

                <Link
                  to="/admin/system-admins"
                  className={`flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    location.pathname === "/admin/system-admins"
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  } transition-colors`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span>System Admins</span>
                </Link>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-3 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600">
          <p>&copy; {new Date().getFullYear()} PJEasy. All rights reserved.</p>
          <div className="flex space-x-3">
            <a href="#" className="hover:text-indigo-600">
              Privacy
            </a>
            <a href="#" className="hover:text-indigo-600">
              Terms
            </a>
            <a href="#" className="hover:text-indigo-600">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
