/*
  VallabhaVani book data.
  To add real Bhagavata Purana content: fill in verses inside
  BOOKS.bhagavata.skandhs[skandhNum].adhyays[adhyayNum].verses
  using the same shape as the Gita sample below.
  A verse with no `verses` array (or an empty one) shows as "content coming soon".
*/

const BOOKS = {
  bhagavata: {
    id: 'bhagavata',
    title: { hi: 'श्रीमद्भागवत महापुराण', en: 'Bhagavata Purana' },
    tagline: { hi: 'सम्पूर्ण भागवत महापुराण, हिन्दी में' },
    languages: ['hi'],
    hasSkandh: true,
    // Standard adhyay count per skandh (1-12), total 335 adhyayas.
    skandhAdhyayCounts: [19, 10, 33, 31, 26, 19, 15, 24, 24, 90, 31, 13],
    skandhTitles: {
      hi: ['प्रथम स्कन्ध', 'द्वितीय स्कन्ध', 'तृतीय स्कन्ध', 'चतुर्थ स्कन्ध', 'पञ्चम स्कन्ध',
        'षष्ठ स्कन्ध', 'सप्तम स्कन्ध', 'अष्टम स्कन्ध', 'नवम स्कन्ध', 'दशम स्कन्ध',
        'एकादश स्कन्ध', 'द्वादश स्कन्ध']
    },
    // skandhs[n].adhyays[m] = { verses: [...] }  -- empty for now, add content here.
    skandhs: {}
  },

  gita: {
    id: 'gita',
    title: { hi: 'श्रीमद् भगवद्गीता', en: 'Bhagavad Gita', sa: 'श्रीमद्भगवद्गीता' },
    tagline: { hi: 'नमूना अध्याय — केवल परीक्षण हेतु (Sample chapter — for testing only)' },
    languages: ['sa', 'hi', 'en'],
    hasSkandh: false,
    sample: true,
    adhyayCount: 18,
    adhyays: {
      1: {
        title: { hi: 'अध्याय १ — अर्जुन विषाद योग', en: 'Chapter 1 — Arjuna Vishada Yoga', sa: 'अथ प्रथमोऽध्यायः' },
        verses: [
          {
            num: 1,
            speaker: { hi: 'धृतराष्ट्र उवाच', en: 'Dhritarashtra said', sa: 'धृतराष्ट्र उवाच' },
            sa: 'धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥',
            hi: 'धृतराष्ट्र ने कहा — हे संजय! धर्मभूमि कुरुक्षेत्र में युद्ध की इच्छा से एकत्र हुए मेरे और पाण्डु के पुत्रों ने क्या किया?',
            en: 'Dhritarashtra said: O Sanjaya, assembled on the sacred field of Kurukshetra, eager for battle, what did my sons and the sons of Pandu do?'
          },
          {
            num: 2,
            speaker: { hi: 'सञ्जय उवाच', en: 'Sanjaya said', sa: 'सञ्जय उवाच' },
            sa: 'दृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा।\nआचार्यमुपसंगम्य राजा वचनमब्रवीत्॥',
            hi: 'संजय ने कहा — उस समय राजा दुर्योधन ने व्यूह-रचना में खड़ी पाण्डव-सेना को देखकर आचार्य द्रोण के पास जाकर यह वचन कहा।',
            en: 'Sanjaya said: Having seen the army of the Pandavas arrayed for battle, King Duryodhana then approached his teacher Drona and spoke these words.'
          },
          {
            num: 3,
            sa: 'पश्यैतां पाण्डुपुत्राणामाचार्य महतीं चमूम्।\nव्यूढां द्रुपदपुत्रेण तव शिष्येण धीमता॥',
            hi: 'हे आचार्य! आपके बुद्धिमान शिष्य द्रुपदपुत्र (धृष्टद्युम्न) द्वारा व्यूह-रचना में खड़ी की गई पाण्डुपुत्रों की इस विशाल सेना को देखिए।',
            en: 'Behold, O teacher, this mighty army of the sons of Pandu, arrayed by your wise disciple, the son of Drupada.'
          }
        ]
      }
    }
  }
};
