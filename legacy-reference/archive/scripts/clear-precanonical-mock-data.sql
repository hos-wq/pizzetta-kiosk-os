-- One-time RC cleanup: remove pre-2026-10-15 operational/mock records.
-- Canonical room data, reference catalogs, schema, settings and the current
-- authentication session are intentionally preserved.

PRAGMA foreign_keys = ON;

DELETE FROM tenancy_check_ins;
DELETE FROM tenancy_checkouts;
DELETE FROM tenancy_documents;
DELETE FROM tenancy_wifi_selections;
DELETE FROM settlement_financial_actions;
DELETE FROM settlement_items;
DELETE FROM utility_charges;
DELETE FROM utility_readings;
DELETE FROM payments;
DELETE FROM journal_lines;
DELETE FROM journal_entries;
DELETE FROM tenancies;

DELETE FROM turnover_tasks;
DELETE FROM service_catalog_nodes WHERE 0;
DELETE FROM maintenance_events;
DELETE FROM maintenance_issues;
DELETE FROM availability_blocks;
DELETE FROM operational_tasks;

DELETE FROM inventory_room_item_states;
DELETE FROM inventory_assets;
DELETE FROM inventory_nodes;

DELETE FROM viewings;
DELETE FROM reservations;
DELETE FROM follow_ups;
DELETE FROM lead_objections;
DELETE FROM lead_unit_interests;
DELETE FROM lead_events;
DELETE FROM messenger_deliveries;
DELETE FROM channel_message_deliveries;
DELETE FROM conversation_messages;
DELETE FROM messaging_attention;
DELETE FROM messaging_conversation_controls;
DELETE FROM messaging_processed_events;
DELETE FROM person_messaging_signals;
DELETE FROM person_leads;
DELETE FROM person_external_identities;
DELETE FROM person_labels;
DELETE FROM person_requirements;
DELETE FROM leads;
DELETE FROM persons;

DELETE FROM media_records;
DELETE FROM mutation_requests;
DELETE FROM room_listing_fields;
DELETE FROM audit_log;
