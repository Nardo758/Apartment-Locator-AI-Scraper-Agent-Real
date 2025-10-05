SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

\restrict YqcNJ4e0kdAqkpshlFbSghmsDAGXezHFHjURIlSOb3iow909siJmuzchygllkow

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: properties_basic; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: agent_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: agent_processing_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scrape_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_results; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: property_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."property_sources" ("id", "url", "property_name", "website_name", "is_active", "scrape_frequency", "last_scraped", "next_scrape", "priority", "expected_units", "region", "metadata", "created_at", "updated_at", "success_rate", "avg_units_found", "last_error", "consecutive_failures", "avg_cost_per_scrape", "total_cost", "claude_analyzed", "claude_confidence", "intelligence_last_updated") VALUES
	(1, 'https://www.apartments.com/atlanta-ga/', 'Atlanta Apartments', 'apartments.com', true, 'weekly', NULL, '2025-10-06 08:28:44.73015+00', 8, 100, 'atlanta', '{}', '2025-10-02 21:45:38.224368+00', '2025-10-02 21:45:38.308006+00', 100.00, 0, NULL, 0, 0.0000, 0.00, false, NULL, NULL),
	(2, 'https://www.rent.com/georgia/atlanta-apartments', 'Atlanta Rent Listings', 'rent.com', true, 'weekly', NULL, '2025-10-07 14:38:41.447084+00', 7, 80, 'atlanta', '{}', '2025-10-02 21:45:38.224368+00', '2025-10-02 21:45:38.308006+00', 100.00, 0, NULL, 0, 0.0000, 0.00, false, NULL, NULL),
	(3, 'https://www.zillow.com/atlanta-ga/rentals/', 'Atlanta Zillow Rentals', 'zillow.com', true, 'daily', NULL, '2025-10-08 06:01:29.141287+00', 9, 150, 'atlanta', '{}', '2025-10-02 21:45:38.224368+00', '2025-10-02 21:45:38.308006+00', 100.00, 0, NULL, 0, 0.0000, 0.00, false, NULL, NULL),
	(4, 'https://www.apartmentguide.com/apartments/Georgia/Atlanta/', 'Atlanta Apartment Guide', 'apartmentguide.com', true, 'weekly', NULL, '2025-10-06 10:35:37.10232+00', 6, 60, 'atlanta', '{}', '2025-10-02 21:45:38.224368+00', '2025-10-02 21:45:38.308006+00', 100.00, 0, NULL, 0, 0.0000, 0.00, false, NULL, NULL);


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: apartment_iq_data; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: apartments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: batch_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: failed_scrapes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: market_intelligence; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: performance_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: property_intelligence; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rental_offers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rental_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scraped_properties; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scraping_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scraping_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scraping_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."scraping_queue" ("id", "external_id", "property_id", "unit_number", "url", "source", "status", "priority", "data", "error", "created_at", "started_at", "completed_at", "priority_tier", "last_change_date", "change_frequency", "priority_score", "last_successful_scrape", "scrape_attempts", "success_rate", "avg_scrape_duration", "property_source_id") VALUES
	(2, 'amli_arts_center', 'amli_arts_center', '', 'https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center', 'amli', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(3, 'amli_midtown', 'amli_midtown', '', 'https://www.amli.com/apartments/atlanta/midtown-apartments', 'amli', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(4, 'atlantic_house', 'atlantic_house', '', 'https://atlantichousemidtown.com', 'atlantic', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(5, 'novel_midtown_atlanta', 'novel_midtown_atlanta', '', 'https://novelmidtownatl.com', 'novel', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(6, 'sentral_west_midtown', 'sentral_west_midtown', '', 'https://sentral.com/atlanta/west-midtown', 'sentral', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(7, 'windsor_at_midtown', 'windsor_at_midtown', '', 'https://www.windsoratmidtown.com', 'windsor', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(8, 'broadstone_2thirty', 'broadstone_2thirty', '', 'https://www.broadstone2thirty.com', 'broadstone', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(9, 'centennial_place', 'centennial_place', '', 'https://www.centennialplaceapts.com', 'centennial', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(10, 'grace_residences', 'grace_residences', '', 'https://www.thegraceresidences.com', 'grace', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(11, 'standard_atlanta', 'standard_atlanta', '', 'https://www.thestandardatl.com', 'standard', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(12, 'vue_midtown', 'vue_midtown', '', 'https://www.vuemidtown.com', 'vue', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(13, 'novel_west_midtown', 'novel_west_midtown', '', 'https://www.novelwestmidtown.com', 'novel', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(14, 'porter_westside', 'porter_westside', '', 'https://www.porterwestside.com', 'porter', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(15, 'exchange_west_end', 'exchange_west_end', '', 'https://www.exchangewestend.com', 'exchange', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(16, 'cortland_brookhaven', 'cortland_brookhaven', '', 'https://cortland.com/apartments/atlanta-metro/cortland-brookhaven', 'cortland', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(17, 'maa_brookhaven', 'maa_brookhaven', '', 'https://www.maac.com/georgia/atlanta/maa-brookhaven', 'maa', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(18, 'post_brookhaven', 'post_brookhaven', '', 'https://www.postbrookhaven.com', 'post', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(19, 'reserve_brookhaven', 'reserve_brookhaven', '', 'https://www.reservebrookhaven.com', 'reserve', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(20, 'maa_milstead', 'maa_milstead', '', 'https://www.maac.com/georgia/atlanta/maa-milstead/', 'maa', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL),
	(21, 'highlands_sweetwater', 'highlands_sweetwater', '', 'https://highlandsatsweetwatercreek.com/', 'highlands', 'queued', 1, NULL, NULL, '2025-10-05 04:36:21.152712+00', NULL, NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL, NULL);


--
-- Data for Name: sources; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."system_config" ("config_key", "config_value", "updated_at") VALUES
	('scraper_system', '{"features": {"autoRetry": true, "smartBatching": true, "costOptimization": true, "realTimeMonitoring": true}, "schedule": "0 0 * * 0", "batchSize": 50, "timeoutMs": 30000, "claudeModel": "claude-3-haiku-20240307", "claudeEnabled": true, "retryAttempts": 3, "dailyCostLimit": 50, "alertThresholds": {"dailyCost": 40, "errorRate": 0.15, "queueSize": 100}, "scrapingEnabled": true, "maxConcurrentJobs": 5, "enableCostTracking": true}', '2025-10-02 21:45:37.308723+00');


--
-- Data for Name: system_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: worker_health; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."worker_health" ("worker_name", "status", "last_ping", "version", "metadata") VALUES
	('ai-scraper-worker', 'healthy', '2025-10-02 21:45:37.308723+00', '1.0.0', '{"description": "AI processing worker"}'),
	('scraper-orchestrator', 'healthy', '2025-10-02 21:45:37.308723+00', '1.0.0', '{"description": "Batch orchestration worker"}'),
	('scraper-worker', 'healthy', '2025-10-02 21:45:37.308723+00', '1.0.0', '{"description": "Data collection worker"}'),
	('command-station', 'healthy', '2025-10-02 21:45:37.308723+00', '1.0.0', '{"description": "Command and control interface"}');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: agent_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."agent_costs_id_seq"', 1, false);


--
-- Name: agent_processing_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."agent_processing_queue_id_seq"', 1, false);


--
-- Name: batch_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."batch_jobs_id_seq"', 1, false);


--
-- Name: failed_scrapes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."failed_scrapes_id_seq"', 1, false);


--
-- Name: performance_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."performance_snapshots_id_seq"', 1, false);


--
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."price_history_id_seq"', 1, false);


--
-- Name: properties_basic_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."properties_basic_id_seq"', 1, false);


--
-- Name: property_intelligence_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."property_intelligence_id_seq"', 1, false);


--
-- Name: property_sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."property_sources_id_seq"', 4, true);


--
-- Name: rental_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."rental_prices_id_seq"', 1, false);


--
-- Name: scraped_properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."scraped_properties_id_seq"', 1, false);


--
-- Name: scraping_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."scraping_logs_id_seq"', 1, false);


--
-- Name: scraping_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."scraping_queue_id_seq"', 21, true);


--
-- Name: sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."sources_id_seq"', 1, false);


--
-- Name: system_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."system_events_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict YqcNJ4e0kdAqkpshlFbSghmsDAGXezHFHjURIlSOb3iow909siJmuzchygllkow

RESET ALL;
