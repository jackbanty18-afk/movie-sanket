import * as sqlite from "./db";
import * as pgdb from "./db-pg";

// Prefer PG if DB_DRIVER=pg, or if a DATABASE_URL is present (production safety)
const usePg = (() => {
  const driver = (process.env.DB_DRIVER || "").toLowerCase();
  if (driver === "pg") return true;
  if (process.env.DATABASE_URL) return true;
  return false;
})();

// Public endpoints
export const listPublicCategoriesWithCounts = (...args: Parameters<typeof sqlite.listPublicCategoriesWithCounts>) =>
  usePg ? (pgdb.listPublicCategoriesWithCounts as any)(...args) : (sqlite.listPublicCategoriesWithCounts as any)(...args);

export const listPublicMovies = (...args: Parameters<typeof sqlite.listPublicMovies>) =>
  usePg ? (pgdb.listPublicMovies as any)(...args) : (sqlite.listPublicMovies as any)(...args);

export const getPublicMovie = (...args: Parameters<typeof sqlite.getPublicMovie>) =>
  usePg ? (pgdb.getPublicMovie as any)(...args) : (sqlite.getPublicMovie as any)(...args);

// Logs & audit
export const getAccessLogs = (...args: Parameters<typeof sqlite.getAccessLogs>) =>
  usePg ? (pgdb.getAccessLogs as any)(...args) : (sqlite.getAccessLogs as any)(...args);

export const getAppLogs = (...args: Parameters<typeof sqlite.getAppLogs>) =>
  usePg ? (pgdb.getAppLogs as any)(...args) : (sqlite.getAppLogs as any)(...args);

export const getAuditTrails = (...args: Parameters<typeof sqlite.getAuditTrails>) =>
  usePg ? (pgdb.getAuditTrails as any)(...args) : (sqlite.getAuditTrails as any)(...args);

export const getLogStatistics = (...args: Parameters<typeof sqlite.getLogStatistics>) =>
  usePg ? (pgdb.getLogStatistics as any)(...args) : (sqlite.getLogStatistics as any)(...args);

// Log writers
export const logAccessRequest = (...args: Parameters<typeof sqlite.logAccessRequest>) =>
  usePg ? (pgdb.logAccessRequest as any)(...args) : (sqlite.logAccessRequest as any)(...args);
export const logAppEvent = (...args: Parameters<typeof sqlite.logAppEvent>) =>
  usePg ? (pgdb.logAppEvent as any)(...args) : (sqlite.logAppEvent as any)(...args);
export const logAuditTrail = (...args: Parameters<typeof sqlite.logAuditTrail>) =>
  usePg ? (pgdb.logAuditTrail as any)(...args) : (sqlite.logAuditTrail as any)(...args);

// Auth / users / profiles / roles
export const getUserByEmail = (...args: Parameters<typeof sqlite.getUserByEmail>) =>
  usePg ? (pgdb.getUserByEmail as any)(...args) : (sqlite.getUserByEmail as any)(...args);
export const createUser = (...args: Parameters<typeof sqlite.createUser>) =>
  usePg ? (pgdb.createUser as any)(...args) : (sqlite.createUser as any)(...args);
export const upsertProfile = (...args: Parameters<typeof sqlite.upsertProfile>) =>
  usePg ? (pgdb.upsertProfile as any)(...args) : (sqlite.upsertProfile as any)(...args);
export const ensureRole = (...args: Parameters<typeof sqlite.ensureRole>) =>
  usePg ? (pgdb.ensureRole as any)(...args) : (sqlite.ensureRole as any)(...args);
export const assignRoleToUserId = (...args: Parameters<typeof sqlite.assignRoleToUserId>) =>
  usePg ? (pgdb.assignRoleToUserId as any)(...args) : (sqlite.assignRoleToUserId as any)(...args);
export const getRolesByEmail = (...args: Parameters<typeof sqlite.getRolesByEmail>) =>
  usePg ? (pgdb.getRolesByEmail as any)(...args) : (sqlite.getRolesByEmail as any)(...args);
export const getProfileByEmail = (...args: Parameters<typeof sqlite.getProfileByEmail>) =>
  usePg ? (pgdb.getProfileByEmail as any)(...args) : (sqlite.getProfileByEmail as any)(...args);

// Tickets
export const listTicketsByEmail = (...args: Parameters<typeof sqlite.listTicketsByEmail>) =>
  usePg ? (pgdb.listTicketsByEmail as any)(...args) : (sqlite.listTicketsByEmail as any)(...args);
export const insertTicket = (...args: Parameters<typeof sqlite.insertTicket>) =>
  usePg ? (pgdb.insertTicket as any)(...args) : (sqlite.insertTicket as any)(...args);

// Admin users
export const listAllUsers = (...args: Parameters<typeof sqlite.listAllUsers>) =>
  usePg ? (pgdb.listAllUsers as any)(...args) : (sqlite.listAllUsers as any)(...args);
export const getUserWithStats = (...args: Parameters<typeof sqlite.getUserWithStats>) =>
  usePg ? (pgdb.getUserWithStats as any)(...args) : (sqlite.getUserWithStats as any)(...args);
export const banUser = (...args: Parameters<typeof sqlite.banUser>) =>
  usePg ? (pgdb.banUser as any)(...args) : (sqlite.banUser as any)(...args);
export const unbanUser = (...args: Parameters<typeof sqlite.unbanUser>) =>
  usePg ? (pgdb.unbanUser as any)(...args) : (sqlite.unbanUser as any)(...args);
export const updateUserStatus = (...args: Parameters<typeof sqlite.updateUserStatus>) =>
  usePg ? (pgdb.updateUserStatus as any)(...args) : (sqlite.updateUserStatus as any)(...args);

// Admin bookings
export const listAllBookings = (...args: Parameters<typeof sqlite.listAllBookings>) =>
  usePg ? (pgdb.listAllBookings as any)(...args) : (sqlite.listAllBookings as any)(...args);
export const getBooking = (...args: Parameters<typeof sqlite.getBooking>) =>
  usePg ? (pgdb.getBooking as any)(...args) : (sqlite.getBooking as any)(...args);
export const updateBookingStatus = (...args: Parameters<typeof sqlite.updateBookingStatus>) =>
  usePg ? (pgdb.updateBookingStatus as any)(...args) : (sqlite.updateBookingStatus as any)(...args);
export const processRefund = (...args: Parameters<typeof sqlite.processRefund>) =>
  usePg ? (pgdb.processRefund as any)(...args) : (sqlite.processRefund as any)(...args);
export const updateBookingSeats = (...args: Parameters<typeof sqlite.updateBookingSeats>) =>
  usePg ? (pgdb.updateBookingSeats as any)(...args) : (sqlite.updateBookingSeats as any)(...args);
export const getBookingsByUser = (...args: Parameters<typeof sqlite.getBookingsByUser>) =>
  usePg ? (pgdb.getBookingsByUser as any)(...args) : (sqlite.getBookingsByUser as any)(...args);

// Movies / categories
export const listMovies = (...args: Parameters<typeof sqlite.listMovies>) =>
  usePg ? (pgdb.listMovies as any)(...args) : (sqlite.listMovies as any)(...args);
export const getMovie = (...args: Parameters<typeof sqlite.getMovie>) =>
  usePg ? (pgdb.getMovie as any)(...args) : (sqlite.getMovie as any)(...args);
export const listCategories = (...args: Parameters<typeof sqlite.listCategories>) =>
  usePg ? (pgdb.listCategories as any)(...args) : (sqlite.listCategories as any)(...args);
export const createCategory = (...args: Parameters<typeof sqlite.createCategory>) =>
  usePg ? (pgdb.createCategory as any)(...args) : (sqlite.createCategory as any)(...args);
export const deleteCategory = (...args: Parameters<typeof sqlite.deleteCategory>) =>
  usePg ? (pgdb.deleteCategory as any)(...args) : (sqlite.deleteCategory as any)(...args);
export const getMovieCategoryIds = (...args: Parameters<typeof sqlite.getMovieCategoryIds>) =>
  usePg ? (pgdb.getMovieCategoryIds as any)(...args) : (sqlite.getMovieCategoryIds as any)(...args);
export const setMovieCategories = (...args: Parameters<typeof sqlite.setMovieCategories>) =>
  usePg ? (pgdb.setMovieCategories as any)(...args) : (sqlite.setMovieCategories as any)(...args);
export const upsertMovie = (...args: Parameters<typeof sqlite.upsertMovie>) =>
  usePg ? (pgdb.upsertMovie as any)(...args) : (sqlite.upsertMovie as any)(...args);
export const deleteMovie = (...args: Parameters<typeof sqlite.deleteMovie>) =>
  usePg ? (pgdb.deleteMovie as any)(...args) : (sqlite.deleteMovie as any)(...args);

// Shows & theatres
export const listShows = (...args: Parameters<typeof sqlite.listShows>) =>
  usePg ? (pgdb.listShows as any)(...args) : (sqlite.listShows as any)(...args);
export const upsertShow = (...args: Parameters<typeof sqlite.upsertShow>) =>
  usePg ? (pgdb.upsertShow as any)(...args) : (sqlite.upsertShow as any)(...args);
export const deleteShow = (...args: Parameters<typeof sqlite.deleteShow>) =>
  usePg ? (pgdb.deleteShow as any)(...args) : (sqlite.deleteShow as any)(...args);
export const listTheatres = (...args: Parameters<typeof sqlite.listTheatres>) =>
  usePg ? (pgdb.listTheatres as any)(...args) : (sqlite.listTheatres as any)(...args);
export const upsertTheatre = (...args: Parameters<typeof sqlite.upsertTheatre>) =>
  usePg ? (pgdb.upsertTheatre as any)(...args) : (sqlite.upsertTheatre as any)(...args);
export const deleteTheatre = (...args: Parameters<typeof sqlite.deleteTheatre>) =>
  usePg ? (pgdb.deleteTheatre as any)(...args) : (sqlite.deleteTheatre as any)(...args);
export const getTheatrePricing = (...args: Parameters<typeof sqlite.getTheatrePricing>) =>
  usePg ? (pgdb.getTheatrePricing as any)(...args) : (sqlite.getTheatrePricing as any)(...args);
export const listPricingTiers = (...args: Parameters<typeof sqlite.listPricingTiers>) =>
  usePg ? (pgdb.listPricingTiers as any)(...args) : (sqlite.listPricingTiers as any)(...args);
export const createPricingTier = (...args: Parameters<typeof sqlite.createPricingTier>) =>
  usePg ? (pgdb.createPricingTier as any)(...args) : (sqlite.createPricingTier as any)(...args);
export const updatePricingTier = (...args: Parameters<typeof sqlite.updatePricingTier>) =>
  usePg ? (pgdb.updatePricingTier as any)(...args) : (sqlite.updatePricingTier as any)(...args);
export const deletePricingTier = (...args: Parameters<typeof sqlite.deletePricingTier>) =>
  usePg ? (pgdb.deletePricingTier as any)(...args) : (sqlite.deletePricingTier as any)(...args);
export const getSeatTemplate = (...args: Parameters<typeof sqlite.getSeatTemplate>) =>
  usePg ? (pgdb.getSeatTemplate as any)(...args) : (sqlite.getSeatTemplate as any)(...args);
export const upsertSeatTemplate = (...args: Parameters<typeof sqlite.upsertSeatTemplate>) =>
  usePg ? (pgdb.upsertSeatTemplate as any)(...args) : (sqlite.upsertSeatTemplate as any)(...args);
export const deleteSeatTemplate = (...args: Parameters<typeof sqlite.deleteSeatTemplate>) =>
  usePg ? (pgdb.deleteSeatTemplate as any)(...args) : (sqlite.deleteSeatTemplate as any)(...args);
export const getTheatreSchedules = (...args: Parameters<typeof sqlite.getTheatreSchedules>) =>
  usePg ? (pgdb.getTheatreSchedules as any)(...args) : (sqlite.getTheatreSchedules as any)(...args);
export const upsertTheatreSchedule = (...args: Parameters<typeof sqlite.upsertTheatreSchedule>) =>
  usePg ? (pgdb.upsertTheatreSchedule as any)(...args) : (sqlite.upsertTheatreSchedule as any)(...args);
export const deleteTheatreSchedule = (...args: Parameters<typeof sqlite.deleteTheatreSchedule>) =>
  usePg ? (pgdb.deleteTheatreSchedule as any)(...args) : (sqlite.deleteTheatreSchedule as any)(...args);
export const upsertTheatrePricing = (...args: Parameters<typeof sqlite.upsertTheatrePricing>) =>
  usePg ? (pgdb.upsertTheatrePricing as any)(...args) : (sqlite.upsertTheatrePricing as any)(...args);
export const deleteTheatrePricing = (...args: Parameters<typeof sqlite.deleteTheatrePricing>) =>
  usePg ? (pgdb.deleteTheatrePricing as any)(...args) : (sqlite.deleteTheatrePricing as any)(...args);
