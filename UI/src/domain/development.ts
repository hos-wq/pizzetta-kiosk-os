import { people as fixturePeople, rooms as fixtureRooms, serviceTaxonomy as fixtureTaxonomy, serviceTaxonomyRelations as fixtureRelations, tasks as fixtureTasks } from '../fixtures.ts';
import { adaptPersonFixture, adaptRoomFixture, adaptTaskFixture } from './fixtures.ts';
import type { Person, Room } from './entities.ts';

/** Explicit development adapter: these are demonstration records, not verified production data. */
export const developmentRooms = fixtureRooms;
export const developmentPeople = fixturePeople;
export const developmentTasks = fixtureTasks;
export const developmentServiceTaxonomy = fixtureTaxonomy;
export const developmentServiceTaxonomyRelations = fixtureRelations;
export const developmentDomainRooms: readonly Room[] = fixtureRooms.map(adaptRoomFixture);
export const developmentDomainPeople: readonly Person[] = fixturePeople.map(adaptPersonFixture);
export const developmentDomainOperations = fixtureTasks.map((task) => adaptTaskFixture(task, developmentDomainRooms)).filter((operation) => Boolean(operation));
