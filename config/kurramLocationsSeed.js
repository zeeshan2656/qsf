/**
 * Comprehensive Kurram District & Kohat–Thall–Sadda–Parachinar Route Location Directory
 *
 * Hierarchy:
 *   Pakistan -> Khyber Pakhtunkhwa ->
 *     - Kurram District (Formerly Kurram Agency)
 *       - Upper Kurram (HQ: Parachinar)
 *       - Lower Kurram (HQ: Sadda)
 *       - Central Kurram (Hub: Dogar)
 *     - Hangu District (Gateway route: Thall / Doaba / Hangu)
 *     - Kohat District (Gateway route: Kohat / Usterzai / Raisan)
 *
 * Fields supported for every location:
 *   - name_en, name_ur, alt_names (alternative/local spellings)
 *   - location_type ('Country'|'Province'|'District'|'Tehsil'|'Town'|'Village'|'Area'|'Locality')
 *   - latitude, longitude, maps_url
 *   - data_source (PBS Census / LGKP Village Councils / OpenStreetMap / ReliefWeb / Dawn / Mapcarta / Local Directory)
 *   - verification_status ('verified' | 'needs_review')
 */
module.exports = {
  hierarchy: {
    country: {
      name_en: 'Pakistan',
      name_ur: 'پاکستان',
      alt_names: 'Islamic Republic of Pakistan',
      location_type: 'Country',
      data_source: 'Official National Administrative Boundary',
      verification_status: 'verified'
    },
    province: {
      name_en: 'Khyber Pakhtunkhwa',
      name_ur: 'خیبر پختونخوا',
      alt_names: 'KP / KPK / Formerly NWFP & FATA Merged Districts',
      location_type: 'Province',
      data_source: 'Government of Khyber Pakhtunkhwa (25th Constitutional Amendment Merger)',
      verification_status: 'verified'
    },
    districts: [
      {
        name_en: 'Kurram District',
        name_ur: 'ضلع کرم (سابقہ کرم ایجنسی)',
        alt_names: 'Kurram Agency / Kurram Tribal District',
        location_type: 'District',
        latitude: 33.8992,
        longitude: 70.1008,
        maps_url: 'https://www.google.com/maps/place/Kurram,+Khyber+Pakhtunkhwa,+Pakistan',
        data_source: 'PBS Census & KP Local Government Department (Kohat Division)',
        verification_status: 'verified',
        tehsils: [
          // ===================================================================
          // 1. UPPER KURRAM TEHSIL (HQ: PARACHINAR)
          // ===================================================================
          {
            name_en: 'Upper Kurram',
            name_ur: 'اپر کرم',
            alt_names: 'Upper Kurram Subdivision / Parachinar Tehsil',
            location_type: 'Tehsil',
            latitude: 33.8992,
            longitude: 70.1008,
            maps_url: 'https://www.google.com/maps/place/Upper+Kurram,+Khyber+Pakhtunkhwa,+Pakistan',
            data_source: 'PBS Census & KP Urban Policy Unit',
            verification_status: 'verified',
            settlements: [
              { name_en: 'Parachinar', name_ur: 'پارہ چنار', alt_names: 'Parachinar City / District HQ', location_type: 'Town', latitude: 33.8992, longitude: 70.1008, data_source: 'PBS Census / Survey of Pakistan / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Jalandhar', name_ur: 'جالندھر (جلندر)', alt_names: 'Jilander / Jalandar / Old Jalandhar Walled Village', location_type: 'Village', latitude: 33.9310, longitude: 70.0420, data_source: 'Mapcarta / Geoview / Kurram Valley Historical Wesh Records', verification_status: 'verified' },
              { name_en: 'Sameer', name_ur: 'سمیر', alt_names: 'Samir / Village Sameer', location_type: 'Village', latitude: 33.8840, longitude: 70.1180, data_source: 'Wikimedia Commons / AGP KP Municipal Solar & Infrastructure Audit Records', verification_status: 'verified' },
              { name_en: 'Pewar', name_ur: 'پیواڑ', alt_names: 'Peiwar / Piwar / Peiwar Kotal', location_type: 'Village', latitude: 33.9636, longitude: 69.9467, data_source: 'Survey of Pakistan / LGKP VC Pewar / Wikipedia', verification_status: 'verified' },
              { name_en: 'Shalozan', name_ur: 'شلوزان', alt_names: 'Solozan / Upper Shalozan / Lower Shalozan', location_type: 'Village', latitude: 33.9450, longitude: 70.0086, data_source: 'LGKP VC Shalozan 01 & 02 / Survey of Pakistan', verification_status: 'verified' },
              { name_en: 'Kirman', name_ur: 'کرمان', alt_names: 'Karman / Kirman Para', location_type: 'Village', latitude: 33.9383, longitude: 70.1753, data_source: 'LGKP Village Councils / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Zeran', name_ur: 'زیڑان', alt_names: 'Ziran / Zeran Valley', location_type: 'Village', latitude: 33.9333, longitude: 70.2167, data_source: 'KP BOIT / LGKP VC Zeran / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Kharlachi', name_ur: 'خرلاچی', alt_names: 'Karlachi / Kharlachi Border Crossing', location_type: 'Village', latitude: 33.8789, longitude: 69.9278, data_source: 'Survey of Pakistan / KP Urban Policy Unit', verification_status: 'verified' },
              { name_en: 'Tari Mangal', name_ur: 'تری منگل', alt_names: 'Teri Mangal / Tiri Mangal / Tarimangal', location_type: 'Town', latitude: 33.9817, longitude: 69.8556, data_source: 'LGKP VC Tari Mangal 01 & 02 / Dawn / Survey of Pakistan', verification_status: 'verified' },
              { name_en: 'Malana', name_ur: 'ملانہ', alt_names: 'Malana Village & Dam Area', location_type: 'Village', latitude: 33.9114, longitude: 70.0564, data_source: 'KP BOIT / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Borki', name_ur: 'بوڑکی', alt_names: 'Barki / Burki', location_type: 'Village', latitude: 33.8453, longitude: 70.0681, data_source: 'Wikimedia / LGKP Kharlachi-Borki Circle', verification_status: 'verified' },
              { name_en: 'Boshehra', name_ur: 'بوشہرہ', alt_names: 'Bushara / Boshera', location_type: 'Village', latitude: 33.8540, longitude: 70.1320, data_source: 'Dawn / Al Jazeera / LGKP Upper Kurram VCs', verification_status: 'verified' },
              { name_en: 'Dandar', name_ur: 'ڈنڈر', alt_names: 'Dandar Boshehra', location_type: 'Village', data_source: 'Dawn / Business Recorder (July 2024 Boshehra-Dandar Reports)', verification_status: 'verified' },
              { name_en: 'Ghozgari', name_ur: 'غوزگڑھی', alt_names: 'Ghozgarhi / Ghozgarhy', location_type: 'Village', data_source: 'LGKP Upper Kurram VCs / Wikipedia', verification_status: 'verified' },
              { name_en: 'Nastikot', name_ur: 'نستیکوٹ', alt_names: 'Nasti Kot', location_type: 'Village', data_source: 'LGKP Upper Kurram VCs / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Shingak', name_ur: 'شنگک', alt_names: 'Shingak Upper Kurram', location_type: 'Village', data_source: 'LGKP Upper Kurram VCs / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Luqman Khel', name_ur: 'لقمان خیل', alt_names: 'Luqmankhel', location_type: 'Village', data_source: 'LGKP Upper Kurram VCs / FATA Directory', verification_status: 'verified' },
              { name_en: 'Kach Kina', name_ur: 'کچ کینہ', alt_names: 'Kachkeena / Kach & Kina', location_type: 'Village', data_source: 'LGKP Upper Kurram VCs / Express Tribune 2017 Roster', verification_status: 'verified' },
              { name_en: 'Mali Khel', name_ur: 'مالی خیل', alt_names: 'Malikhel', location_type: 'Village', data_source: 'Dawn / LGKP Upper Kurram VCs', verification_status: 'verified' },
              { name_en: 'Chapri', name_ur: 'چپری (اپر کرم)', alt_names: 'Chapri Upper Kurram', location_type: 'Village', data_source: 'FATA Revenue Mauza Directory', verification_status: 'verified' },
              { name_en: 'Ahmad Zai', name_ur: 'احمد زئی', alt_names: 'Ahmadzai Upper Kurram', location_type: 'Village', data_source: 'LGKP Upper Kurram VCs', verification_status: 'verified' },
              { name_en: 'Bosar', name_ur: 'بوسر', alt_names: 'Bosar Upper Kurram', location_type: 'Village', data_source: 'Mapcarta (Neighboring Jalandhar & Amamkot)', verification_status: 'verified' },
              { name_en: 'Amamkot', name_ur: 'امام کوٹ', alt_names: 'Imam Kot / Amam Kot', location_type: 'Village', data_source: 'Mapcarta (Upper Kurram / Jalandhar Sector)', verification_status: 'verified' },
              { name_en: 'Kunj Alizai', name_ur: 'کنج علی زئی', alt_names: 'Khunj Alizai / Kunj', location_type: 'Village', latitude: 33.8810, longitude: 70.0680, data_source: 'Mapcarta / Dawn (Upper Kurram near Parachinar)', verification_status: 'verified' },
              { name_en: 'Shalozan Tangi', name_ur: 'شلوزان تنگی', alt_names: 'Tangi Shalozan', location_type: 'Village', data_source: 'OpenStreetMap / Local Administrative Records', verification_status: 'verified' },
              { name_en: 'Pewar Kotal', name_ur: 'پیواڑ کوتل', alt_names: 'Peiwar Kotal Pass Village', location_type: 'Locality', latitude: 33.9690, longitude: 69.9210, data_source: 'Survey of Pakistan / Historical Gazetteer', verification_status: 'verified' },
              { name_en: 'Mehwara', name_ur: 'مہوارہ', alt_names: 'Mahwara Upper Kurram', location_type: 'Village', data_source: 'Official Parachinar Jan 2017 Casualty Roster / Local Directory', verification_status: 'verified' },
              { name_en: 'Zargaran Chapper', name_ur: 'زرگران چھپر', alt_names: 'Zargan Chapper / Zarran Chapper', location_type: 'Village', data_source: 'Official Parachinar Jan 2017 Casualty Roster', verification_status: 'verified' },
              { name_en: 'Sara Gullah', name_ur: 'سرہ گلہ', alt_names: 'Sra Galla / Sara Gala', location_type: 'Village', data_source: 'Official Parachinar Jan 2017 Casualty Roster', verification_status: 'verified' },
              { name_en: 'Sari Yousaf Khel', name_ur: 'سری یوسف خیل', alt_names: 'Yoopra Sari Yousafkhail', location_type: 'Village', data_source: 'Official Parachinar Jan 2017 Casualty Roster', verification_status: 'verified' },
              { name_en: 'Pash Khel', name_ur: 'پش خیل', alt_names: 'Pash Khail', location_type: 'Village', data_source: 'Official Parachinar Jan 2017 Casualty Roster', verification_status: 'verified' },
              { name_en: 'Khushi', name_ur: 'خوشی (پارہ چنار)', alt_names: 'Khushi Parachinar', location_type: 'Locality', data_source: 'Official Parachinar Jan 2017 Casualty Roster', verification_status: 'verified' },
              { name_en: 'Amir Hamza Colony', name_ur: 'امیر حمزہ کالونی (پارہ چنار)', alt_names: 'Amir Hamza Colony Parachinar', location_type: 'Locality', data_source: 'Official Parachinar Jan 2017 Casualty Roster', verification_status: 'verified' },
              { name_en: 'Turi Bazaar', name_ur: 'طوری بازار (پارہ چنار)', alt_names: 'Turi Market Parachinar', location_type: 'Locality', latitude: 33.8980, longitude: 70.0995, data_source: 'Dawn / BBC / Reuters (Parachinar Central Commercial Hub)', verification_status: 'verified' },
              { name_en: 'Noor Market', name_ur: 'نور مارکیٹ (پارہ چنار)', alt_names: 'Noor Market Imambargah Road Parachinar', location_type: 'Locality', latitude: 33.8975, longitude: 70.1012, data_source: 'Dawn / Al Jazeera (March 2017 Bombing Site)', verification_status: 'verified' },
              { name_en: 'Eidgah Sabzi Mandi', name_ur: 'عیدگاہ سبزی منڈی (پارہ چنار)', alt_names: 'Parachinar Vegetable Market / Eidgah Market', location_type: 'Locality', latitude: 33.8965, longitude: 70.0985, data_source: 'Dawn / Express Tribune (January 2017 Bombing Site)', verification_status: 'verified' },
              { name_en: 'Landa Bazaar', name_ur: 'لنڈا بازار (پارہ چنار)', alt_names: 'Parachinar Clothes Market', location_type: 'Locality', data_source: 'Dawn / BBC (December 2015 Bombing Site)', verification_status: 'verified' },
              { name_en: 'Muqbal', name_ur: 'مقبل', alt_names: 'Moqbil / Muqbil Area', location_type: 'Area', data_source: 'NCHR / Dawn Kurram Tribal Reports', verification_status: 'verified' },
              { name_en: 'Kachai', name_ur: 'کچئی', alt_names: 'Kachai Upper Kurram', location_type: 'Village', data_source: 'FATA Revenue Directory / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Sangarra', name_ur: 'سنگرہ', alt_names: 'Sangara Upper Kurram', location_type: 'Village', data_source: 'Local Administrative Directory', verification_status: 'needs_review' },
              { name_en: 'Bughaki', name_ur: 'بغکی', alt_names: 'Bughakai', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Karra Khela', name_ur: 'کڑہ خیلہ', alt_names: 'Kara Khela', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Lalmai', name_ur: 'للمئی', alt_names: 'Lal Mai', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Qubad Shah Khel', name_ur: 'قباد شاہ خیل', alt_names: 'Qubad Shahkhel', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Agra', name_ur: 'آگرہ', alt_names: 'Agra Upper Kurram', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Alamshir', name_ur: 'علم شیر', alt_names: 'Alam Sher', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Sadara', name_ur: 'سدرہ', alt_names: 'Sadra', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Dangila', name_ur: 'ڈنگیلہ', alt_names: 'Dangeela', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Sultan', name_ur: 'سلطان', alt_names: 'Sultan Village Upper Kurram', location_type: 'Village', data_source: 'Local Settlement Reference (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Gidu', name_ur: 'گیدو', alt_names: 'Gido Border Post Area', location_type: 'Locality', data_source: 'Upper Kurram Border Reference (Pending Review)', verification_status: 'needs_review' }
            ]
          },

          // ===================================================================
          // 2. LOWER KURRAM TEHSIL (HQ: SADDA)
          // ===================================================================
          {
            name_en: 'Lower Kurram',
            name_ur: 'لوئر کرم',
            alt_names: 'Lower Kurram Subdivision / Sadda-Alizai Tehsil',
            location_type: 'Tehsil',
            latitude: 33.7044,
            longitude: 70.3264,
            maps_url: 'https://www.google.com/maps/place/Lower+Kurram,+Khyber+Pakhtunkhwa,+Pakistan',
            data_source: 'PBS Census & KP Urban Policy Unit',
            verification_status: 'verified',
            settlements: [
              { name_en: 'Sadda', name_ur: 'صدہ', alt_names: 'Sadda Town / Tehsil HQ Lower Kurram', location_type: 'Town', latitude: 33.7044, longitude: 70.3264, data_source: 'PBS Census / Town Committee Sadda / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Alizai', name_ur: 'علی زئی', alt_names: 'Alizai Town Lower Kurram', location_type: 'Town', latitude: 33.5419, longitude: 70.3458, data_source: 'PBS Census / Wikipedia / Survey of Pakistan', verification_status: 'verified' },
              { name_en: 'Bagan', name_ur: 'بگن', alt_names: 'Baggan / Baghan', location_type: 'Town', latitude: 33.5756, longitude: 70.3442, data_source: 'ReliefWeb / Dawn / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Bagzai', name_ur: 'بگزئی', alt_names: 'Bagzai Lower Kurram', location_type: 'Village', latitude: 33.5247, longitude: 70.3278, data_source: 'Wikipedia / Survey of Pakistan', verification_status: 'verified' },
              { name_en: 'Manduri', name_ur: 'مندوری', alt_names: 'Mandori / Mandoori', location_type: 'Village', latitude: 33.5950, longitude: 70.3490, data_source: 'Dawn / FATA Revenue Mauza Directory', verification_status: 'verified' },
              { name_en: 'Ochit', name_ur: 'اوچت', alt_names: 'Ochut / Uchat / Ochat', location_type: 'Village', latitude: 33.5880, longitude: 70.3460, data_source: 'Dawn / CPJ / Pakistan Today (Nov 2024 & Feb 2025 Convoy Corridor)', verification_status: 'verified' },
              { name_en: 'Dad Kamar', name_ur: 'داد کمر', alt_names: 'Dadkamar Lower Kurram', location_type: 'Village', data_source: 'Dawn / Pakistan Today (Thall-Parachinar Highway Corridor)', verification_status: 'verified' },
              { name_en: 'Char Khel', name_ur: 'چار خیل', alt_names: 'Charkhel Lower Kurram', location_type: 'Village', data_source: 'Dawn / Pakistan Today (Lower Kurram Highway Corridor)', verification_status: 'verified' },
              { name_en: 'Balish Khel', name_ur: 'بلش خیل', alt_names: 'Balishkhel / Balesh Khel', location_type: 'Village', latitude: 33.7150, longitude: 70.3120, data_source: 'Dawn / FATA Revenue Mauza Directory / Wikipedia', verification_status: 'verified' },
              { name_en: 'Sangeena', name_ur: 'سنگینہ', alt_names: 'Sangina / Sangeena Balishkhel', location_type: 'Village', data_source: 'Dawn (Balishkhel-Sangeena Sector Reports)', verification_status: 'verified' },
              { name_en: 'Khar Killay', name_ur: 'خار کلے', alt_names: 'Khar Kalay / Khar Kali Lower Kurram', location_type: 'Village', data_source: 'Dawn (Lower Kurram / Balishkhel Sector)', verification_status: 'verified' },
              { name_en: 'Ibrahim Zai', name_ur: 'ابراہیم زئی', alt_names: 'Ibrahimzai Lower Kurram', location_type: 'Village', data_source: 'FATA Revenue Mauza Directory / AGP KP Records', verification_status: 'verified' },
              { name_en: 'Billy Amin', name_ur: 'بلی امین', alt_names: 'Bilyamin / Bili Amin', location_type: 'Village', data_source: 'FATA Revenue Mauza Directory (root.pk)', verification_status: 'verified' },
              { name_en: 'Pir Qayyum', name_ur: 'پیر قیوم', alt_names: 'Peer Qayyum Lower Kurram', location_type: 'Village', data_source: 'FATA Revenue Mauza Directory / Thall-Parachinar Road', verification_status: 'verified' },
              { name_en: 'Arawali', name_ur: 'اراولی', alt_names: 'Arawali Camp / Arawali Village', location_type: 'Village', data_source: 'FATA Revenue Mauza Directory / ReliefWeb', verification_status: 'verified' },
              { name_en: 'Kaiwas', name_ur: 'کیواس', alt_names: 'Kewas / Kaiwas Lower Kurram', location_type: 'Village', data_source: 'Dawn / SATP (2010 Kaiwas Clashes Reports)', verification_status: 'verified' },
              { name_en: 'Shatiak', name_ur: 'شتیاک', alt_names: 'Shatyak Lower Kurram', location_type: 'Village', data_source: 'Thall-Parachinar Highway Directory', verification_status: 'verified' },
              { name_en: 'Chapri', name_ur: 'چپری (لوئر کرم)', alt_names: 'Chapri Lower Kurram Gateway', location_type: 'Village', data_source: 'FATA Revenue Mauza Directory / Highway Checkpost', verification_status: 'verified' },
              { name_en: 'Durrani', name_ur: 'درانی (صدہ)', alt_names: 'Durrani Camp / Durrani Sadda', location_type: 'Locality', data_source: 'UNHCR / ReliefWeb IDP Camp & Settlement Records', verification_status: 'verified' },
              { name_en: 'Ratta', name_ur: 'رتہ', alt_names: 'Ratta Lower Kurram', location_type: 'Village', data_source: 'Dawn (Oct 2024 Convoy & Clashes Reports)', verification_status: 'verified' },
              { name_en: 'Tangi', name_ur: 'تنگی (لوئر کرم)', alt_names: 'Tangi Lower Kurram', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Maroo Khel', name_ur: 'مارو خیل', alt_names: 'Marukhel', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Makhi Zai', name_ur: 'مکھی زئی', alt_names: 'Makhizai', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Nazari Kalay', name_ur: 'نظری کلے', alt_names: 'Nazari Killay', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Inzari', name_ur: 'انزری', alt_names: 'Inzaray', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Jelamay', name_ur: 'جلامے', alt_names: 'Jilamai / Jelamai', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Shakar Dara', name_ur: 'شکر درہ', alt_names: 'Shakardara Lower Kurram', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Topaki', name_ur: 'ٹوپکی', alt_names: 'Topakai', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Besatoo', name_ur: 'بیستو', alt_names: 'Bisatu', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Amal Kot', name_ur: 'عمل کوٹ', alt_names: 'Amalkot Lower Kurram', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' },
              { name_en: 'Gharbina', name_ur: 'غربینہ', alt_names: 'Gharbeena', location_type: 'Village', data_source: 'Kurram Reference Directory (Pending Mauza Verification)', verification_status: 'needs_review' }
            ]
          },

          // ===================================================================
          // 3. CENTRAL KURRAM TEHSIL (FORMERLY F.R. KURRAM / HUB: DOGAR)
          // ===================================================================
          {
            name_en: 'Central Kurram',
            name_ur: 'سینٹرل کرم',
            alt_names: 'Central Kurram Subdivision / Formerly FR Kurram',
            location_type: 'Tehsil',
            latitude: 33.7800,
            longitude: 70.3500,
            maps_url: 'https://www.google.com/maps/place/Central+Kurram,+Khyber+Pakhtunkhwa,+Pakistan',
            data_source: 'PBS Census & KP Urban Policy Unit',
            verification_status: 'verified',
            settlements: [
              { name_en: 'Dogar', name_ur: 'ڈوگر', alt_names: 'Dogar Town / Central Kurram Hub', location_type: 'Town', latitude: 33.7850, longitude: 70.3700, data_source: 'KP Urban Policy Unit / CWD KP Sadda-Dogar Road', verification_status: 'verified' },
              { name_en: 'Badama', name_ur: 'بادامہ', alt_names: 'Badama Central Kurram', location_type: 'Village', data_source: 'Wikipedia / ReliefWeb Central Kurram Directory', verification_status: 'verified' },
              { name_en: 'Marghan', name_ur: 'مرغان', alt_names: 'Marghan Village', location_type: 'Village', data_source: 'Central Kurram Administrative Records', verification_status: 'verified' },
              { name_en: 'Tando', name_ur: 'ٹنڈو', alt_names: 'Tando Central Kurram', location_type: 'Village', data_source: 'Central Kurram Administrative Records', verification_status: 'verified' },
              { name_en: 'Sateen', name_ur: 'ستین', alt_names: 'Satin / Tando Sateen', location_type: 'Village', data_source: 'Central Kurram Administrative Records', verification_status: 'verified' },
              { name_en: 'Chenarak', name_ur: 'چنارک', alt_names: 'Chinarak Central Kurram', location_type: 'Village', data_source: 'Dawn / Central Kurram Administrative Records', verification_status: 'verified' },
              { name_en: 'Gawaki', name_ur: 'گواکی', alt_names: 'Gawakay Central Kurram', location_type: 'Village', data_source: 'Central Kurram Administrative Records', verification_status: 'verified' },
              { name_en: 'Manatoo', name_ur: 'مناٹو', alt_names: 'Manatu Central Kurram', location_type: 'Village', data_source: 'Central Kurram Administrative Records', verification_status: 'verified' },
              { name_en: 'Para Chamkani', name_ur: 'پارا چمکنی', alt_names: 'Parachamkani', location_type: 'Area', data_source: 'PBS Census / Historical FATA Tribal Directory', verification_status: 'verified' },
              { name_en: 'Massozai', name_ur: 'مسوزئی', alt_names: 'Masozai Central Kurram', location_type: 'Area', data_source: 'Wikipedia / Historical FATA Tribal Directory', verification_status: 'verified' },
              { name_en: 'Alisherzai', name_ur: 'علی شیرزئی', alt_names: 'Ali Sher Zai Central Kurram', location_type: 'Area', data_source: 'Wikipedia / Historical FATA Tribal Directory', verification_status: 'verified' },
              { name_en: 'Zaimusht', name_ur: 'زیمشت', alt_names: 'Zaimukht Central Kurram', location_type: 'Area', data_source: 'Wikipedia / Historical FATA Tribal Directory', verification_status: 'verified' },
              { name_en: 'Sadda-Dogar Corridor', name_ur: 'صدہ ڈوگر روڈ', alt_names: 'Dogar Road Belt', location_type: 'Area', data_source: 'CWD KP Road Network', verification_status: 'verified' },
              { name_en: 'Makrani', name_ur: 'مکرانی', alt_names: 'Makranay', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Dagger', name_ur: 'ڈگر', alt_names: 'Dagar Central Kurram', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Mandan', name_ur: 'مندان', alt_names: 'Mandan Central Kurram', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Warasta', name_ur: 'وراستہ', alt_names: 'Warasta Central Kurram', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Zarami', name_ur: 'زرمی', alt_names: 'Zaramay', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Sham Kai', name_ur: 'شام کئی', alt_names: 'Shamkai', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Marghan Dara', name_ur: 'مرغان درہ', alt_names: 'Marghan Valley', location_type: 'Area', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Awai Dara', name_ur: 'اوئی درہ', alt_names: 'Awai Valley', location_type: 'Area', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Taki Tangai', name_ur: 'تکی تنگی', alt_names: 'Taki Tangi', location_type: 'Area', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Sar Pakh', name_ur: 'سرپخ', alt_names: 'Sarpakh', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Koraat', name_ur: 'کوراٹ', alt_names: 'Korat', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' },
              { name_en: 'Tabbai', name_ur: 'طبئی', alt_names: 'Tabai Central Kurram', location_type: 'Village', data_source: 'Central Kurram Reference List (Pending Review)', verification_status: 'needs_review' }
            ]
          }
        ]
      },

      // =====================================================================
      // GATEWAY ROUTE DISTRICTS ALONG KOHAT–THALL–PARACHINAR CORRIDOR
      // =====================================================================
      {
        name_en: 'Hangu District',
        name_ur: 'ضلع ہنگو',
        alt_names: 'Hangu / Thall-Parachinar Gateway District',
        location_type: 'District',
        latitude: 33.5319,
        longitude: 71.0595,
        maps_url: 'https://www.google.com/maps/place/Hangu,+Khyber+Pakhtunkhwa,+Pakistan',
        data_source: 'PBS Census & KP Government (Kohat Division)',
        verification_status: 'verified',
        tehsils: [
          {
            name_en: 'Tall (Thall) Tehsil',
            name_ur: 'تحصیل ٹل',
            alt_names: 'Thall Tehsil / Tall',
            location_type: 'Tehsil',
            latitude: 33.3646,
            longitude: 70.5466,
            data_source: 'PBS Census',
            verification_status: 'verified',
            settlements: [
              { name_en: 'Thall', name_ur: 'ٹل', alt_names: 'Tall / Thall Cantt (Kurram Highway Terminal)', location_type: 'Town', latitude: 33.3646, longitude: 70.5466, data_source: 'Survey of Pakistan / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Doaba', name_ur: 'دوآبہ', alt_names: 'Doaba Hangu', location_type: 'Town', data_source: 'PBS Census / OpenStreetMap', verification_status: 'verified' },
              { name_en: 'Darsamand', name_ur: 'درسمند', alt_names: 'Darsamand Thall', location_type: 'Village', data_source: 'OpenStreetMap', verification_status: 'verified' }
            ]
          },
          {
            name_en: 'Hangu Tehsil',
            name_ur: 'تحصیل ہنگو',
            alt_names: 'Hangu Subdivision',
            location_type: 'Tehsil',
            latitude: 33.5319,
            longitude: 71.0595,
            data_source: 'PBS Census',
            verification_status: 'verified',
            settlements: [
              { name_en: 'Hangu', name_ur: 'ہنگو', alt_names: 'Hangu City', location_type: 'Town', latitude: 33.5319, longitude: 71.0595, data_source: 'PBS Census', verification_status: 'verified' },
              { name_en: 'Ibrahimzai (Hangu)', name_ur: 'ابراہیم زئی (ہنگو)', alt_names: 'Ibrahimzai Kohat-Hangu Road', location_type: 'Village', data_source: 'OpenStreetMap', verification_status: 'verified' }
            ]
          }
        ]
      },
      {
        name_en: 'Kohat District',
        name_ur: 'ضلع کوہاٹ',
        alt_names: 'Kohat Division Headquarters',
        location_type: 'District',
        latitude: 33.5869,
        longitude: 71.4414,
        maps_url: 'https://www.google.com/maps/place/Kohat,+Khyber+Pakhtunkhwa,+Pakistan',
        data_source: 'PBS Census & KP Government',
        verification_status: 'verified',
        tehsils: [
          {
            name_en: 'Kohat Tehsil',
            name_ur: 'تحصیل کوہاٹ',
            alt_names: 'Kohat Urban & Rural',
            location_type: 'Tehsil',
            latitude: 33.5869,
            longitude: 71.4414,
            data_source: 'PBS Census',
            verification_status: 'verified',
            settlements: [
              { name_en: 'Kohat', name_ur: 'کوہاٹ', alt_names: 'Kohat City', location_type: 'Town', latitude: 33.5869, longitude: 71.4414, data_source: 'PBS Census', verification_status: 'verified' },
              { name_en: 'Usterzai', name_ur: 'استرزئی', alt_names: 'Ustarzai Payan / Ustarzai Bala', location_type: 'Village', data_source: 'PBS Census / Kohat-Hangu Highway', verification_status: 'verified' },
              { name_en: 'Raisan', name_ur: 'ریسان', alt_names: 'Raisan Kohat-Hangu Road', location_type: 'Village', data_source: 'OpenStreetMap', verification_status: 'verified' }
            ]
          }
        ]
      }
    ]
  }
};
