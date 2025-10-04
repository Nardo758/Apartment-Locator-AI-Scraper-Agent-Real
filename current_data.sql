SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

\restrict 3rIzGm5UUMwyeCbLrMk5vhHbhwueAuB3M89SF9kNgfD1dlvte8uAZyiCI5pRcPO

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
-- Data for Name: scrape_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ai_results; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."properties" ("id", "external_id", "name", "address", "city", "state", "zip", "latitude", "longitude", "bedrooms", "bathrooms", "sqft", "year_built", "property_type", "original_price", "ai_price", "effective_price", "rent_per_sqft", "savings", "match_score", "market_velocity", "availability", "availability_type", "features", "amenities", "pet_policy", "parking", "apartment_iq_data", "is_active", "source_url", "images", "last_scraped", "created_at", "updated_at") VALUES
	('ddedf8a7-a43e-4784-97a9-5f8847ad8f6c', 'test_building_U1', 'Unit U1', '1 Test St', 'Testville', 'TS', NULL, NULL, NULL, 1, 1.0, 0, NULL, 'apartment', 1000, 1000, 1000, NULL, 0, NULL, 'normal', 'active', 'immediate', '{}', '{}', NULL, NULL, '{}', true, 'https://example.com/u1', '{}', '2025-09-23 06:58:06.429171+00', '2025-09-23 06:58:06.429171+00', '2025-09-23 06:58:06.429171+00'),
	('0b089795-489e-4257-b53d-fd7e86606822', 'test_elora_property_1', 'Elora at Buckhead Test', '123 Test St', 'Atlanta', 'GA', NULL, NULL, NULL, 2, 2.0, 0, NULL, 'apartment', 2000, 2000, 2000, NULL, 0, NULL, 'normal', 'active', 'immediate', '{}', '{}', NULL, NULL, '{}', true, 'https://www.eloraatbuckhead.com/', '{}', '2025-09-27 19:44:12.87775+00', '2025-09-27 19:44:12.87775+00', '2025-09-27 19:44:12.87775+00');


--
-- Data for Name: apartment_iq_data; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: apartments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."apartments" ("id", "title", "description", "address", "city", "state", "zip_code", "bedrooms", "bathrooms", "square_feet", "property_type", "rent_amount", "deposit_amount", "furnished", "pets_allowed", "available_date", "is_available", "contact_name", "contact_email", "created_at", "updated_at", "external_id", "rent_price", "source", "amenities", "scraped_at", "is_active", "contact_info", "source_url", "source_name", "scraping_job_id", "intelligence_confidence", "intelligence_source", "researched_at", "year_built", "unit_count", "building_type", "neighborhood", "transit_access", "walk_score") VALUES
	('a247c409-88d6-45d6-ae32-b30c8647f47f', 'Modern Downtown Apartment', NULL, '123 Pine Street', 'Seattle', 'WA', NULL, 2, 2.0, NULL, 'apartment', 2500.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-25 22:27:43.254144+00', '2025-09-25 22:27:43.254144+00', NULL, NULL, 'legacy_migration', '[]', NULL, true, '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('72b9654e-5574-41c2-a3a1-d2d3db926aa3', 'Cozy Capitol Hill Studio', NULL, '456 Broadway Ave', 'Seattle', 'WA', NULL, 0, 1.0, NULL, 'studio', 1800.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-25 22:27:43.254144+00', '2025-09-25 22:27:43.254144+00', NULL, NULL, 'legacy_migration', '[]', NULL, true, '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('5192833f-e03c-421e-b232-0d9583338d55', 'Spacious Belltown Loft', NULL, '789 1st Avenue', 'Seattle', 'WA', NULL, 1, 1.5, NULL, 'loft', 2200.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-25 22:27:43.254144+00', '2025-09-25 22:27:43.254144+00', NULL, NULL, 'legacy_migration', '[]', NULL, true, '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('26165b31-4f4d-4de1-87e2-7e2cf18838d2', 'Unit U1', NULL, '1 Test St', 'Testville', 'TS', NULL, 1, 1.0, NULL, 'apartment', 1000.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-26 01:46:20.158471+00', '2025-09-26 01:46:20.158471+00', 'test_building_U1', 1000, 'legacy_migration', '[]', '2025-09-23 06:58:06.429171+00', true, '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('fd741812-3869-4588-a8af-8fb4ca7fa8f6', 'Test Apartment', NULL, '123 Main St', 'Atlanta', 'GA', NULL, 2, 1.0, NULL, 'apartment', 1500.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-27 19:08:45.470146+00', '2025-09-27 19:08:45.470146+00', 'final_test_id', 1500, 'test', '[]', '2025-09-27 19:08:45.428+00', true, '{}', 'https://test.com', 'Test Source', 999, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('86b32a28-4a93-411b-bb15-5fa33f6327b8', 'Production Test Apartment', NULL, '456 Oak Ave', 'Atlanta', 'GA', NULL, 3, 2.0, NULL, 'apartment', 1800.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-27 19:09:36.958619+00', '2025-09-27 19:09:36.958619+00', 'production_test', 1800, 'test', '[]', '2025-09-27 19:09:36.862+00', true, '{}', 'https://production-test.com', 'Production Test', 1000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('90b668c3-162a-427a-9dfc-7c6bc8dbee2f', 'Luxury Apartment', NULL, '123 Main St', 'Atlanta', 'GA', NULL, 2, 2.0, NULL, 'apartment', 2400.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-27 19:31:24.714795+00', '2025-09-27 19:31:24.714795+00', 'ai-1759001484588-dy13wsl7z', 2400, 'Test Source', '[]', '2025-09-27 19:31:24.588+00', true, '{}', 'https://example.com', 'Test Property', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('f9b5d8cf-e745-4b87-918b-9869b9a7333b', 'Elora Test Apartment', NULL, '3372 Peachtree Road NE', 'Atlanta', 'GA', NULL, 1, 1.0, NULL, 'apartment', 2500.00, NULL, false, false, NULL, true, NULL, NULL, '2025-09-27 19:33:20.906154+00', '2025-09-27 19:33:20.906154+00', 'ai-1759001600840-6oskc25et', 2500, 'elora-test', '[]', '2025-09-27 19:33:20.84+00', true, '{}', 'https://www.eloraatbuckhead.com/', 'Elora at Buckhead', 999, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: market_intelligence; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."price_history" ("id", "external_id", "price", "recorded_at", "change_type") VALUES
	(1, 'test_1', 999, '2025-09-23 06:18:27.149577+00', 'manual_test'),
	(2, 'test_1', 175, '2025-09-23 06:21:10.137957+00', 'increased'),
	(3, 'test_1', 200, '2025-09-23 06:29:35.268691+00', 'increased'),
	(4, 'test_building_U1', 1000, '2025-09-23 06:58:06.429171+00', 'scraped'),
	(7, 'test_elora_property_1', 2000, '2025-09-27 19:44:12.87775+00', 'initial'),
	(8, 'test_sentral_1759281316925_1', 1500, '2025-10-01 12:11:07.63973+00', 'initial');


--
-- Data for Name: price_history_backup_pre_enhanced; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."price_history_backup_pre_enhanced" ("id", "external_id", "price", "recorded_at", "change_type") VALUES
	(1, 'real_test', 0, '2025-09-23 04:48:43.44114+00', 'scraped');


--
-- Data for Name: property_intelligence; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rental_offers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scraped_properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."scraped_properties" ("id", "property_id", "unit_number", "source", "name", "address", "unit", "city", "state", "current_price", "bedrooms", "bathrooms", "square_feet", "free_rent_concessions", "application_fee", "admin_fee_waived", "admin_fee_amount", "security_deposit", "first_seen_at", "last_seen_at", "status", "listing_url", "scraped_at", "created_at", "updated_at", "volatility_score", "price_change_count", "last_price_change", "latitude", "longitude", "zip_code", "square_footage", "amenities", "days_on_market", "market_velocity", "concession_value", "concession_type", "unit_features", "pet_policy", "parking_info", "property_type", "ai_price", "effective_price", "market_position", "percentile_rank") VALUES
	(1, 'test_building', 'U1', 'test', 'Unit U1', '1 Test St', 'U1', 'Testville', 'TS', 1000, 1, 1.0, NULL, NULL, NULL, false, NULL, NULL, '2025-09-23 06:58:06.429171+00', '2025-09-23 06:58:06.429171+00', 'active', 'https://example.com/u1', '2025-09-23 06:58:06.429171+00', '2025-09-23 06:58:06.429171+00', '2025-09-23 06:58:06.429171+00', 47, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	(12, 'test_elora_property', '1', 'eloraatbuckhead.com', 'Elora at Buckhead Test', '123 Test St', NULL, 'Atlanta', 'GA', 2000, 2, 2.0, NULL, NULL, NULL, false, NULL, NULL, '2025-09-27 19:44:12.87775+00', '2025-09-27 19:44:12.87775+00', 'active', 'https://www.eloraatbuckhead.com/', '2025-09-27 19:44:12.87775+00', '2025-09-27 19:44:12.87775+00', '2025-09-27 19:44:12.87775+00', 47, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	(13, 'test_sentral_1759281316925', '1', 'test_manual', 'Sentral West Midtown - Test', '123 Test St', NULL, 'Atlanta', 'GA', 1500, 1, 1.0, NULL, NULL, NULL, false, NULL, NULL, '2025-10-01 12:11:07.63973+00', '2025-10-01 12:11:07.63973+00', 'active', 'https://www.sentral.com/atlanta/west-midtown', '2025-10-01 12:11:07.63973+00', '2025-10-01 12:11:07.63973+00', '2025-10-01 12:11:07.63973+00', 50, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: scraped_properties_backup_pre_enhanced; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."scraped_properties_backup_pre_enhanced" ("source", "name", "address", "city", "state", "current_price", "bedrooms", "bathrooms", "listing_url", "created_at", "id", "free_rent_concessions", "application_fee", "admin_fee_waived", "admin_fee_amount", "scraped_at", "last_scraped", "updated_at", "property_id", "unit_number", "unit", "square_feet", "security_deposit", "first_seen_at", "last_seen_at", "status", "external_id") VALUES
	('apartments_com', 'To be scraped', 'To be scraped', 'To be scraped', 'XX', 0, 0, 0.0, 'https://www.apartments.com/500-figueroa-ter-los-angeles-ca/2epz6y2/', '2025-09-23 04:35:30.689924+00', 1, NULL, NULL, false, NULL, '2025-09-23 04:48:43.44114+00', NULL, '2025-09-23 04:48:43.44114+00', 'real', 'test', NULL, NULL, NULL, '2025-09-23 04:58:48.691513+00', '2025-09-23 04:58:48.691513+00', 'active', 'real_test');


--
-- Data for Name: scraping_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scraping_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."scraping_costs" ("id", "date", "properties_scraped", "ai_requests", "estimated_cost", "tokens_used", "details", "created_at") VALUES
	(1, '2025-09-23', 1, 1, 0.0500, 123, '{}', '2025-09-24 02:03:24.279535+00'),
	(2, '2025-09-27', 8, 10, 0.1109, 4259, '{"model": "gpt-4-turbo-preview", "last_update": "2025-09-27T19:47:00.264239+00:00", "prompt_tokens": 171, "completion_tokens": 94}', '2025-09-27 18:50:24.01635+00');


--
-- Data for Name: scraping_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: scraping_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."scraping_queue" ("id", "external_id", "property_id", "unit_number", "url", "source", "status", "priority", "data", "error", "created_at", "started_at", "completed_at", "priority_tier", "last_change_date", "change_frequency", "priority_score", "last_successful_scrape", "scrape_attempts", "success_rate", "avg_scrape_duration") VALUES
	(15, 'high_priority_1758999717089_0', 'prop_1758999717089_0', '1', 'https://www.eloraatbuckhead.com/', 'elora_at_buckhead', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTfbjgvLyN1b1ZCFeYmMo"}}', '2025-09-27 19:01:57.644882+00', '2025-10-01 01:19:50.524+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(6, 'high_priority_1758998972352_1', 'prop_1758998972352_1', '1', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-midtown-atlanta', 'camden_midtown_atlanta', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:41.394+00', 3, NULL, NULL, 50, '2025-09-27 18:49:41.384324+00', 1, 1.00, 684),
	(7, 'high_priority_1758998972352_2', 'prop_1758998972352_2', '1', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-buckhead-square', 'camden_buckhead_square', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:42.458+00', 3, NULL, NULL, 50, '2025-09-27 18:49:42.430928+00', 1, 1.00, 446),
	(2, 'test_building_U1', 'test_building', 'U1', 'https://example.com/test_building_U1', 'e2e-test', 'completed', 1, NULL, NULL, '2025-09-23 07:40:53.555677+00', '2025-09-23 07:41:00.20329+00', '2025-09-23 07:41:01.747+00', 2, NULL, NULL, 75, '2025-09-27 18:24:57.455584+00', 1, 1.00, 840),
	(1, 'test_building_U1', 'test_building', 'U1', 'https://example.com/test_building_U1', 'e2e-test', 'completed', 1, NULL, NULL, '2025-09-23 07:35:02.804014+00', '2025-09-27 18:24:56.296612+00', '2025-09-27 18:24:57.469+00', 2, NULL, NULL, 75, '2025-09-27 18:24:57.455584+00', 2, 1.00, 912),
	(20, 'high_priority_1758999717089_5', 'prop_1758999717089_5', '1', 'https://www.highland-walk.com/', 'highland_walk_apartments', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTeem825S4Lo1n3N1DavY"}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 13:18:55.939+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(57, 'atl_1759197171016_35_1', 'atl_1759197171016_35', '1', 'https://www.hanover-company.com/', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude result failed validation","data":{"concessions":[],"free_rent_concessions":null,"waived_fees":null,"name":null,"address":null,"city":null,"state":null,"current_price":null,"bedrooms":null,"bathrooms":null,"square_feet":null,"application_fee":null,"admin_fee_waived":null,"admin_fee_amount":null,"base_rent":null,"effective_rent":null,"amenities":[],"unit_features":[]}}', '2025-09-30 01:52:51.019+00', '2025-09-30 13:19:47.873+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(8, 'high_priority_1758998972352_3', 'prop_1758998972352_3', '1', 'https://www.camdenliving.com/apartments/atlanta-ga', 'camden_atlanta_portal', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:43.562+00', 3, NULL, NULL, 50, '2025-09-27 18:49:43.55018+00', 1, 1.00, 474),
	(5, 'high_priority_1758998972352_0', 'prop_1758998972352_0', '1', 'https://www.eloraatbuckhead.com/', 'elora_at_buckhead', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:39.82+00', 3, NULL, NULL, 50, '2025-09-27 18:49:39.805859+00', 1, 1.00, 579),
	(19, 'high_priority_1758999717089_4', 'prop_1758999717089_4', '1', 'https://www.amli.com/apartments/atlanta', 'amli_atlanta_portal', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude result failed validation","data":{"concessions":["Historic Fourth Ward Park offers 17 acres of greenspace. The main section includes open, passive lawns, a playground, a splashpad, an outdoor theater and a 2-acre lake, while a second phase features a skate park, another playground, and a large multi-use athletic field."],"free_rent_concessions":null,"waived_fees":null,"name":null,"address":null,"city":null,"state":null,"current_price":null,"bedrooms":null,"bathrooms":null,"square_feet":null,"application_fee":null,"admin_fee_waived":null,"admin_fee_amount":null,"base_rent":null,"effective_rent":null,"amenities":["Historic Fourth Ward Park","Ponce City Market","The Beltline"],"unit_features":null}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 21:35:50.043+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(9, 'high_priority_1758998972352_4', 'prop_1758998972352_4', '1', 'https://www.amli.com/apartments/atlanta', 'amli_atlanta_portal', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:44.359+00', 3, NULL, NULL, 50, '2025-09-27 18:49:44.348576+00', 1, 1.00, 315),
	(10, 'high_priority_1758998972352_5', 'prop_1758998972352_5', '1', 'https://www.highland-walk.com/', 'highland_walk_apartments', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:46.163+00', 3, NULL, NULL, 50, '2025-09-27 18:49:46.153024+00', 1, 1.00, 821),
	(11, 'high_priority_1758998972352_6', 'prop_1758998972352_6', '1', 'https://inmanquarter.com/', 'inman_quarter', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:47.453+00', 3, NULL, NULL, 50, '2025-09-27 18:49:47.430826+00', 1, 1.00, 545),
	(27, 'elora_orchestrator_test_1759001611493', 'elora_orchestrator_test_1759001611493', '1', 'https://www.eloraatbuckhead.com/', 'eloraatbuckhead.com', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTfMQefW1BAD4JxoLYm68"}}', '2025-09-27 19:33:32.243435+00', '2025-09-30 22:11:56.847+00', NULL, 2, NULL, NULL, 100, NULL, 1, 0.50, 0),
	(12, 'high_priority_1758998972352_7', 'prop_1758998972352_7', '1', 'https://www.elmesandysprings.com/', 'elme_sandy_springs', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:48.64+00', 3, NULL, NULL, 50, '2025-09-27 18:49:48.612965+00', 1, 1.00, 497),
	(13, 'high_priority_1758998972352_8', 'prop_1758998972352_8', '1', 'https://cortland.com/apartments/atlanta-metro/', 'cortland_atlanta_metro', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:49.365+00', 3, NULL, NULL, 50, '2025-09-27 18:49:49.355466+00', 1, 1.00, 273),
	(14, 'high_priority_1758998972352_9', 'prop_1758998972352_9', '1', 'https://www.apartmentlist.com/', 'apartmentlist', 'completed', 1, NULL, NULL, '2025-09-27 18:49:32.918634+00', '2025-09-27 18:49:38.488942+00', '2025-09-27 18:49:49.782+00', 3, NULL, NULL, 50, '2025-09-27 18:49:49.771917+00', 1, 1.00, 126),
	(16, 'high_priority_1758999717089_1', 'prop_1758999717089_1', '1', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-midtown-atlanta', 'camden_midtown_atlanta', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqm4cUNh2RgYkAWaV1i"}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 03:02:37.088+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(18, 'high_priority_1758999717089_3', 'prop_1758999717089_3', '1', 'https://www.camdenliving.com/apartments/atlanta-ga', 'camden_atlanta_portal', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqmBNmdjyWR5TChUfiC"}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 03:02:37.088+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(53, 'atl_1759197171016_31_1', 'atl_1759197171016_31', '1', 'https://www.parkplacebuckhead.com/', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqqFmJW28SMPWxtnNDN"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:03:16.294+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(32, 'atl_1759197171016_3_1', 'atl_1759197171016_3', '1', 'https://www.maac.com/georgia/atlanta/maa-midtown/', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTdqhuj6QXEBDzkXvSpP7"}}', '2025-09-30 01:52:51.018+00', '2025-09-30 03:01:52.956+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(34, 'atl_1759197171016_5_1', 'atl_1759197171016_5', '1', 'https://www.maac.com/georgia/atlanta/', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude result failed validation","data":{"concessions":["Up to 2 Months Free Rent"],"free_rent_concessions":["Up to 2 Months Free Rent"],"waived_fees":null,"name":"678 Spacious Luxury Apartments in Atlanta, GA for Rent | MAA","address":null,"city":"Atlanta","state":"GA","current_price":null,"bedrooms":null,"bathrooms":null,"square_feet":null,"application_fee":null,"admin_fee_waived":null,"admin_fee_amount":null,"base_rent":null,"effective_rent":null,"amenities":["Pool","24hr Fitness Center","Grill and Picnic Area","Smart Home Technology","Tennis","Garage Parking","Bark Park","High Speed Internet","Playground","Park Access","On Site Recycling","Gated Community","Clubhouse","In Unit Laundry","Fitness Center","Pet Wash Station","Package Lockers","Volleyball","Retail Access","Fitness Center with MIRROR","Electric Car Charging Station","Saltwater Pool","Concierge Service","Running Trails","Cabana"],"unit_features":null}}', '2025-09-30 01:52:51.018+00', '2025-09-30 03:01:52.956+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(41, 'atl_1759197171016_16_1', 'atl_1759197171016_16', '1', 'https://www.virginiahighlandsapartments.com/', 'direct_property', 'failed', 2, NULL, 'Failed to fetch any pages from the property website', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:19.952+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(44, 'atl_1759197171016_21_1', 'atl_1759197171016_21', '1', 'https://www.gatewaychastainsandysprings.com/', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqjr7NBFrfHUckY9wES"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:19.951+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(22, 'high_priority_1758999717089_7', 'prop_1758999717089_7', '1', 'https://www.elmesandysprings.com/', 'elme_sandy_springs', 'failed', 1, NULL, 'Failed to fetch any pages from the property website', '2025-09-27 19:01:57.644882+00', '2025-09-30 03:02:28.556+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(21, 'high_priority_1758999717089_6', 'prop_1758999717089_6', '1', 'https://inmanquarter.com/', 'inman_quarter', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqkUAHywSVSzRjncbSC"}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 03:02:28.556+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(23, 'high_priority_1758999717089_8', 'prop_1758999717089_8', '1', 'https://cortland.com/apartments/atlanta-metro/', 'cortland_atlanta_metro', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqkaaWAqdMXc52t1kwH"}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 03:02:28.557+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(54, 'atl_1759197171016_32_1', 'atl_1759197171016_32', '1', 'https://www.suttonbuckhead.com/', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqmiiRMMVSweBHGJedG"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:47.493+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(36, 'atl_1759197171016_9_1', 'atl_1759197171016_9', '1', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-buckhead', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqmmZL7ZHiRhieR3gZe"}}', '2025-09-30 01:52:51.018+00', '2025-09-30 03:02:47.493+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(30, 'atl_1759197171016_0_1', 'atl_1759197171016_0', '1', 'https://buckhead960.com/', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqn6KgvqwWWmJXpnGNw"}}', '2025-09-30 01:52:51.016+00', '2025-09-30 03:02:47.492+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(39, 'atl_1759197171016_13_1', 'atl_1759197171016_13', '1', 'https://www.amli.com/apartments/atlanta/brookhaven-apartments/amli-brookhaven', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqnUmZWvSRFP9x1a6e3"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:57.47+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(43, 'atl_1759197171016_19_1', 'atl_1759197171016_19', '1', 'https://www.theoverlooksandysprings.com/', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqoUro9GhWPbyE6YWTu"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:57.47+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(42, 'atl_1759197171016_18_1', 'atl_1759197171016_18', '1', 'https://www.veridianaptsatlanta.com/', 'direct_property', 'failed', 2, NULL, 'Failed to fetch any pages from the property website', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:09.661+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(38, 'atl_1759197171016_12_1', 'atl_1759197171016_12', '1', 'https://www.amli.com/apartments/atlanta/buckhead-apartments/amli-buckhead', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqjBjYa53E2VT1KqKru"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:09.661+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(24, 'high_priority_1758999717089_9', 'prop_1758999717089_9', '1', 'https://www.apartmentlist.com/', 'apartmentlist', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqkMibSz4mkVQa67iq1"}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 03:02:28.556+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0),
	(29, 'test_elora_property_1', 'test_elora_property', '1', 'https://www.eloraatbuckhead.com/', 'eloraatbuckhead.com', 'completed', 1, NULL, NULL, '2025-09-27 19:44:12.991019+00', '2025-09-30 02:05:11.43+00', '2025-09-30 02:05:16.301+00', 2, NULL, NULL, 75, NULL, 3, 0.25, 1258),
	(26, 'elora_test_1759001082988', 'elora_test_1759001082988', '1', 'https://www.eloraatbuckhead.com/', 'eloraatbuckhead.com', 'completed', 1, NULL, NULL, '2025-09-27 19:24:43.685184+00', '2025-09-30 02:05:11.429+00', '2025-09-30 02:05:16.723+00', 2, NULL, NULL, 100, NULL, 1, 0.50, 0),
	(35, 'atl_1759197171016_7_1', 'atl_1759197171016_7', '1', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-phipps', 'direct_property', 'completed', 2, NULL, NULL, '2025-09-30 01:52:51.018+00', '2025-09-30 02:02:21.251+00', '2025-09-30 02:02:37.992+00', 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(31, 'atl_1759197171016_1_1', 'atl_1759197171016_1', '1', 'https://www.mezzoapartmenthomes.com/', 'direct_property', 'completed', 2, NULL, NULL, '2025-09-30 01:52:51.017+00', '2025-09-30 02:13:24.838+00', '2025-09-30 02:13:41.086+00', 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(67, 'test_novel_1759281316925_1', 'test_novel_1759281316925', '1', 'https://www.novelwestmidtown.com', 'test_manual', 'failed', 10, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTfbTiyvTkrbXycG5G7oD"}}', '2025-10-01 01:15:17.348+00', '2025-10-01 01:16:18.351+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(60, 'atl_1759197171016_38_1', 'atl_1759197171016_38', '1', 'https://www.skyhousemidtown.com/', 'direct_property', 'failed', 1, NULL, 'Failed to fetch any pages from the property website', '2025-09-30 01:52:51.019+00', '2025-09-30 03:03:16.293+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(56, 'atl_1759197171016_34_1', 'atl_1759197171016_34', '1', 'https://www.elleofbuckhead.com/', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqjEZT5Ay1eNrZL3hfA"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:09.661+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(68, 'test_broadstone_1759281316925_1', 'test_broadstone_1759281316925', '1', 'https://broadstone2thirty.com', 'test_manual', 'failed', 10, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTfbXh3TNtH3kXFCaGMED"}}', '2025-10-01 01:15:17.447+00', '2025-10-01 01:17:06.907+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(66, 'test_highlands_1759281316925_1', 'test_highlands_1759281316925', '1', 'https://highlandsatsweetwatercreek.com', 'test_manual', 'failed', 10, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTfbQ8tEghgz7THMzR3v5"}}', '2025-10-01 01:15:16.927+00', '2025-10-01 01:15:27.17+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(70, 'test_boulevard_1759281316925_1', 'test_boulevard_1759281316925', '1', 'https://boulevardatgrantpark.com', 'test_manual', 'failed', 10, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your organization''s (5628f602-79a1-408e-89d7-7741a7d03b59) maximum usage increase rate for input tokens per minute. Please scale up your input tokens usage more gradually to stay within the acceleration limit. For details, refer to: https://docs.claude.com/en/api/rate-limits."},"request_id":"req_011CTfbfnJgfdXy1Z7jmNBuQ"}}', '2025-10-01 01:15:17.632+00', '2025-10-01 01:18:56.961+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(51, 'atl_1759197171016_29_1', 'atl_1759197171016_29', '1', 'https://www.sovereignbuckhead.com/', 'direct_property', 'completed', 3, NULL, NULL, '2025-09-30 01:52:51.019+00', '2025-09-30 02:04:08.78+00', '2025-09-30 02:04:12.041+00', 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(55, 'atl_1759197171016_33_1', 'atl_1759197171016_33', '1', 'https://www.alexanbuckheadvillage.com/', 'direct_property', 'completed', 3, NULL, NULL, '2025-09-30 01:52:51.019+00', '2025-09-30 02:04:08.781+00', '2025-09-30 02:04:16.391+00', 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(69, 'test_sentral_1759281316925_1', 'test_sentral_1759281316925', '1', 'https://www.sentral.com/atlanta/west-midtown', 'test_manual', 'completed', 10, NULL, NULL, '2025-10-01 01:15:17.541+00', '2025-10-01 12:10:29.081+00', '2025-10-01 12:10:39.919+00', 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(33, 'atl_1759197171016_4_1', 'atl_1759197171016_4', '1', 'https://www.maac.com/georgia/atlanta/maa-riverside/', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqmuBDmCiiqw1fbJM24"}}', '2025-09-30 01:52:51.018+00', '2025-09-30 03:02:47.493+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(59, 'atl_1759197171016_37_1', 'atl_1759197171016_37', '1', 'https://www.915midtown.com/', 'direct_property', 'failed', 1, NULL, 'Failed to fetch any pages from the property website', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:57.47+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(58, 'atl_1759197171016_36_1', 'atl_1759197171016_36', '1', 'https://www.viewpointmidtown.com/', 'direct_property', 'failed', 3, NULL, 'Failed to fetch any pages from the property website', '2025-09-30 01:52:51.019+00', '2025-09-30 03:01:52.954+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(48, 'atl_1759197171016_26_1', 'atl_1759197171016_26', '1', 'https://www.rentcafe.com/apartments-for-rent/us/ga/atlanta/', 'direct_property', 'failed', 2, NULL, 'Failed to fetch any pages from the property website', '2025-09-30 01:52:51.019+00', '2025-09-30 03:01:52.956+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(37, 'atl_1759197171016_10_1', 'atl_1759197171016_10', '1', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-brookwood', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude result failed validation","data":{"concessions":[],"free_rent_concessions":null,"waived_fees":null,"name":"Camden Brookwood","address":"147 26th St. NW","city":"Atlanta","state":"GA","current_price":1229,"bedrooms":{"min":"Studio","max":2},"bathrooms":{"min":1,"max":2},"square_feet":null,"application_fee":null,"admin_fee_waived":null,"admin_fee_amount":null,"base_rent":1229,"effective_rent":1229,"amenities":["Taupe or gray quartz countertops","Dark gray or white woodgrain cabinets","White subway tile backsplash","Stainless steel appliances","Large undermount sink with pull-down faucet sprayer","Hardwood-style flooring","Loft-style finishes with concrete ceilings","Pet-friendly living","Walk-in closets","Patio or balcony","Full-size washer and dryer included","USB-enabled outlets","Lighted ceiling fan","Pendant lighting","Flexible spaces for a home office in select floor plans","Rent a variety of furniture, small appliances, electronics, linens, décor, and more through our Camden-exclusive [CORT discount](https://www.cort.com/camden).","Airbnb-friendly"],"unit_features":[]}}', '2025-09-30 01:52:51.018+00', '2025-09-30 03:01:52.955+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(45, 'atl_1759197171016_22_1', 'atl_1759197171016_22', '1', 'https://www.atlerbrookhaven.com/', 'direct_property', 'failed', 1, NULL, 'Failed to fetch any pages from the property website', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:57.47+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(47, 'atl_1759197171016_25_1', 'atl_1759197171016_25', '1', 'https://www.apartments.com/atlanta-ga/', 'direct_property', 'completed', 1, NULL, NULL, '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:57.47+00', '2025-09-30 03:03:08.525+00', 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(52, 'atl_1759197171016_30_1', 'atl_1759197171016_30', '1', 'https://www.grandviewbuckhead.com/', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqiwXXSN6oKgMTzzFwa"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:09.66+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(40, 'atl_1759197171016_15_1', 'atl_1759197171016_15', '1', 'https://www.greystar.com/homes-to-rent/us/ga/atlanta-metro', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqjL8ZqSTCLnyHiA7tw"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:09.66+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(50, 'atl_1759197171016_28_1', 'atl_1759197171016_28', '1', 'https://atlanta.promove.com/', 'direct_property', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqoxE5THxu7sTHaR7ym"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:03:16.294+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(46, 'atl_1759197171016_23_1', 'atl_1759197171016_23', '1', 'https://www.marquisbuckhead.com/', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqjkqN6kTGs8YWoLDkj"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:19.952+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(49, 'atl_1759197171016_27_1', 'atl_1759197171016_27', '1', 'https://smartcitylocating.com/atlanta-apartments/', 'direct_property', 'failed', 2, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqjxb3trPG3fZJaEY3X"}}', '2025-09-30 01:52:51.019+00', '2025-09-30 03:02:19.953+00', NULL, 2, NULL, NULL, 50, NULL, 0, 1.00, NULL),
	(17, 'high_priority_1758999717089_2', 'prop_1758999717089_2', '1', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-buckhead-square', 'camden_buckhead_square', 'failed', 1, NULL, 'HTTP 422: Unprocessable Entity - {"status":"error","error":"Claude returned empty response","raw":{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed the rate limit for your organization (5628f602-79a1-408e-89d7-7741a7d03b59) of 50,000 input tokens per minute. For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."},"request_id":"req_011CTdqkSXp9fUbChU1NN9gs"}}', '2025-09-27 19:01:57.644882+00', '2025-09-30 03:02:28.556+00', NULL, 3, NULL, NULL, 50, NULL, 1, 0.50, 0);


--
-- Data for Name: scraping_queue_backup_pre_enhanced; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sources" ("id", "name", "url", "priority", "created_at", "updated_at", "website_type", "scraping_strategy", "last_scraping_success") VALUES
	(1, 'Buckhead960', 'https://buckhead960.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(2, 'Mezzo Buckhead', 'https://www.mezzoapartmenthomes.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(3, 'Elora at Buckhead', 'https://www.eloraatbuckhead.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'property_marketing', 'property_marketing', false),
	(4, 'MAA Midtown', 'https://www.maac.com/georgia/atlanta/maa-midtown/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(5, 'MAA Riverside', 'https://www.maac.com/georgia/atlanta/maa-riverside/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(6, 'MAA Corporate Site (Atlanta)', 'https://www.maac.com/georgia/atlanta/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(7, 'Camden Midtown Atlanta', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-midtown-atlanta', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(8, 'Camden Phipps', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-phipps', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(9, 'Camden Buckhead Square', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-buckhead-square', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(10, 'Camden Buckhead', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-buckhead', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(11, 'Camden Brookwood', 'https://www.camdenliving.com/apartments/atlanta-ga/camden-brookwood', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(12, 'Camden Atlanta Portal', 'https://www.camdenliving.com/apartments/atlanta-ga', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(13, 'AMLI Buckhead', 'https://www.amli.com/apartments/atlanta/buckhead-apartments/amli-buckhead', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(14, 'AMLI Brookhaven', 'https://www.amli.com/apartments/atlanta/brookhaven-apartments/amli-brookhaven', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(15, 'AMLI Atlanta Portal', 'https://www.amli.com/apartments/atlanta', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(16, 'Greystar Atlanta Metro', 'https://www.greystar.com/homes-to-rent/us/ga/atlanta-metro', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'property_manager', 'property_marketing', false),
	(17, 'Greystar Georgia', 'https://www.greystar.com/homes-to-rent/us/ga', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'property_manager', 'property_marketing', false),
	(18, 'Virginia Highlands Apartments', 'https://www.virginiahighlandsapartments.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'listing_aggregator', 'listing_aggregator', false),
	(19, 'Highland Walk Apartments', 'https://www.highland-walk.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(20, 'Highland View Apartments', 'https://www.highlandview-atl.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(21, '675 N Highland', 'https://www.675nhighland.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(22, 'Inman Quarter', 'https://inmanquarter.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(23, 'Veridian at Sandy Springs', 'https://www.veridianaptsatlanta.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(24, 'The Overlook Sandy Springs', 'https://www.theoverlooksandysprings.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(25, 'Elme Sandy Springs', 'https://www.elmesandysprings.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(26, 'The Gateway Chastain', 'https://www.gatewaychastainsandysprings.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(27, 'Atler at Brookhaven', 'https://www.atlerbrookhaven.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(28, 'Marquis at Buckhead', 'https://www.marquisbuckhead.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(29, 'Cortland Atlanta Metro', 'https://cortland.com/apartments/atlanta-metro/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(30, 'Apartments.com Atlanta', 'https://www.apartments.com/atlanta-ga/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'listing_aggregator', 'listing_aggregator', false),
	(31, 'RentCafe Atlanta', 'https://www.rentcafe.com/apartments-for-rent/us/ga/atlanta/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(32, 'ApartmentList', 'https://www.apartmentlist.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(33, 'Smart City Locating', 'https://smartcitylocating.com/atlanta-apartments/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(34, 'PROMOVE Atlanta', 'https://atlanta.promove.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(35, 'Post Properties', 'https://www.post-properties.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(36, 'Bozzuto Properties', 'https://www.bozzuto.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(37, 'Wood Partners', 'https://www.woodpartners.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(38, 'JPI Apartments', 'https://www.jpi.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(39, 'Gables Residential', 'https://www.gables.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(40, 'ZRS Management', 'https://www.zrsmanagement.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(41, 'Aimco', 'https://www.aimco.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(42, 'UDR', 'https://www.udr.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(43, 'Equity Residential', 'https://www.equityapartments.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'listing_aggregator', 'listing_aggregator', false),
	(44, 'AvalonBay Communities', 'https://www.avaloncommunities.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(45, 'The Sovereign at Buckhead', 'https://www.sovereignbuckhead.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(46, 'The Grandview at Buckhead', 'https://www.grandviewbuckhead.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(47, 'Park Place Buckhead', 'https://www.parkplacebuckhead.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(48, 'The Paramount on Peachtree', 'https://www.paramountonpeachtree.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(49, 'Paces Ridge', 'https://www.pacesridge.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(50, 'The Sutton Buckhead', 'https://www.suttonbuckhead.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(51, 'The Metropolitan', 'https://www.themetropolitanbuckhead.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(52, 'Alexan Buckhead Village', 'https://www.alexanbuckheadvillage.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(53, 'Elle of Buckhead', 'https://www.elleofbuckhead.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(54, 'Hanover Buckhead Village', 'https://www.hanover-company.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(55, 'The Atlantic', 'https://www.theatlanticsouth.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(56, 'Atlantic House', 'https://www.atlantichouseatl.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(57, '1016 Residences', 'https://www.1016residences.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(58, 'The Selig', 'https://www.theselig.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(59, 'Viewpoint Midtown', 'https://www.viewpointmidtown.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(60, '915 Midtown', 'https://www.915midtown.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(61, 'Solace on Peachtree', 'https://www.solaceonpeachtree.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(62, 'The Artisan Luxury', 'https://www.theartisanluxury.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(63, 'Novare Opus', 'https://www.novareopus.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(64, 'SkyHouse Midtown', 'https://www.skyhousemidtown.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(65, 'SkyHouse Downtown', 'https://www.skyhousedowntown.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(66, 'The Standard Downtown', 'https://www.standarddowntown.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(67, 'Element Downtown', 'https://www.elementdowntown.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(68, 'Centennial Yards', 'https://www.centennialyards.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(69, 'The Healey Building', 'https://www.healeybuilding.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(70, 'Capitol Gateway', 'https://www.capitolgateway.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(71, 'Urban Capital Lofts', 'https://www.urbancapitallofts.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(72, 'The Flats at Atlantic Station', 'https://www.flatsatlanticstation.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(73, 'Twelve Centennial Park', 'https://www.twelvecentennial.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(74, 'The Lofts at Atlantic Station', 'https://www.atlanticstationlofts.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(75, 'The Beacon at Glenwood Park', 'https://www.beaconatglenwood.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(76, 'Grant Park Lofts', 'https://www.grantparklofts.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(77, 'Eastside Village', 'https://www.eastsidevillage.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(78, 'The Mille at EAV', 'https://www.milleateav.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(79, 'Decatur Square', 'https://www.decatursquare.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(80, 'The Abbey at Decatur', 'https://www.abbeyatdecatur.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(81, 'Bell Decatur', 'https://www.belldecatur.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(82, 'Church Street Station', 'https://www.churchstreetstation.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(83, 'The Artisan at Oakhurst', 'https://www.artisanoakhurst.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(84, 'Krog Street Lofts', 'https://www.krogstreetlofts.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(85, 'Vinings Village', 'https://www.viningsvillage.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(86, 'The Club at Vinings', 'https://www.clubatvinings.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(87, 'Riverside Club', 'https://www.riversideclub.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(88, 'Post Vinings', 'https://www.postvinings.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(89, 'The Residences at Vinings Mountain', 'https://www.viningsresidences.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(90, 'Cumberland Pointe', 'https://www.cumberlandpointe.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(91, 'The Reserve at Ballantyne', 'https://www.reserveballantyne.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(92, 'Marquis on Edwards Mill', 'https://www.marquisonedwards.com/', 'High', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(93, 'The Haven at Riverwood', 'https://www.havenriverwood.com/', 'Medium', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false),
	(94, 'Westwood Commons', 'https://www.westwoodcommons.com/', 'Low', '2025-09-27 18:17:19.347009+00', '2025-09-27 19:39:47.501818+00', 'unknown', 'generic', false);


--
-- Data for Name: user_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("id", "email", "full_name", "avatar_url", "phone", "created_at", "updated_at") VALUES
	('60692f96-27a3-4f4f-87f6-e862ca5fe034', 'test@example.com', 'Test User', NULL, '+1234567890', '2025-09-25 22:20:30.757845+00', '2025-09-25 22:20:30.757845+00'),
	('315131c5-7ec7-45fe-aff5-33cd3fce47b0', 'demo@example.com', 'Demo User', NULL, '+0987654321', '2025-09-25 22:20:30.757845+00', '2025-09-25 22:20:30.757845+00');


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_preferences" ("id", "user_id", "email_notifications", "push_notifications", "sms_notifications", "marketing_emails", "default_location", "default_radius_km", "max_price_range", "min_price_range", "preferred_bedrooms", "preferred_bathrooms", "preferred_property_types", "language", "currency", "timezone", "theme", "profile_visibility", "allow_contact", "show_online_status", "created_at", "updated_at") VALUES
	('4bcc2d42-3311-48d8-aa79-966df82e8eaa', '60692f96-27a3-4f4f-87f6-e862ca5fe034', true, true, false, false, 'New York', 15, NULL, NULL, NULL, NULL, NULL, 'en', 'USD', 'UTC', 'light', 'private', true, false, '2025-09-25 22:20:30.757845+00', '2025-09-25 22:20:30.757845+00');


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."price_history_id_seq"', 8, true);


--
-- Name: property_intelligence_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."property_intelligence_id_seq"', 1, false);


--
-- Name: scraped_properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."scraped_properties_id_seq"', 13, true);


--
-- Name: scraping_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."scraping_costs_id_seq"', 11, true);


--
-- Name: scraping_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."scraping_queue_id_seq"', 70, true);


--
-- Name: sources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."sources_id_seq"', 94, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 3rIzGm5UUMwyeCbLrMk5vhHbhwueAuB3M89SF9kNgfD1dlvte8uAZyiCI5pRcPO

RESET ALL;
