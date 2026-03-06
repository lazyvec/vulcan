import {
  appendEvent as appendEventSqlite,
  countRecords as countRecordsSqlite,
  getAgents as getAgentsSqlite,
  getDocs as getDocsSqlite,
  getEventsSince as getEventsSinceSqlite,
  getLatestEvents as getLatestEventsSqlite,
  getMemoryItems as getMemoryItemsSqlite,
  getProjects as getProjectsSqlite,
  getSchedules as getSchedulesSqlite,
  getTasks as getTasksSqlite,
  updateTaskLane as updateTaskLaneSqlite,
} from "./sqliteStore";
import type { Store } from "./types";

export type { Store } from "./types";

export const store: Store = {
  getAgents: getAgentsSqlite,
  getProjects: getProjectsSqlite,
  getTasks: getTasksSqlite,
  updateTaskLane: updateTaskLaneSqlite,
  getLatestEvents: getLatestEventsSqlite,
  getEventsSince: getEventsSinceSqlite,
  appendEvent: appendEventSqlite,
  getMemoryItems: getMemoryItemsSqlite,
  getDocs: getDocsSqlite,
  getSchedules: getSchedulesSqlite,
  countRecords: countRecordsSqlite,
};

export const getAgents: Store["getAgents"] = (...args) => store.getAgents(...args);
export const getProjects: Store["getProjects"] = (...args) => store.getProjects(...args);
export const getTasks: Store["getTasks"] = (...args) => store.getTasks(...args);
export const updateTaskLane: Store["updateTaskLane"] = (...args) =>
  store.updateTaskLane(...args);
export const getLatestEvents: Store["getLatestEvents"] = (...args) =>
  store.getLatestEvents(...args);
export const getEventsSince: Store["getEventsSince"] = (...args) =>
  store.getEventsSince(...args);
export const appendEvent: Store["appendEvent"] = (...args) => store.appendEvent(...args);
export const getMemoryItems: Store["getMemoryItems"] = (...args) =>
  store.getMemoryItems(...args);
export const getDocs: Store["getDocs"] = (...args) => store.getDocs(...args);
export const getSchedules: Store["getSchedules"] = (...args) => store.getSchedules(...args);
export const countRecords: Store["countRecords"] = (...args) => store.countRecords(...args);
