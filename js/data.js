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
    tagline: { hi: 'अध्याय १ पूर्ण — शेष 17 अध्याय बाद में (Chapter 1 complete — rest coming later)' },
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
            speaker: { hi: 'धृतराष्ट्र उवाच', en: 'Dhritarashtra said' },
            sa: 'धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः ।\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥',
            hi: 'धृतराष्ट्र बोले - हे संजय! धर्मभूमि कुरुक्षेत्र में युद्ध की इच्छा से इकट्ठे हुए मेरे पुत्रों और पाण्डु के पुत्रों ने क्या किया?',
            en: 'Dhritarashtra said: O Sanjaya, assembled on the sacred field of Kurukshetra, eager to fight, what did my sons and the sons of Pandu do?'
          },
          {
            num: 2,
            speaker: { hi: 'संजय उवाच', en: 'Sanjaya said' },
            sa: 'दृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा ।\nआचार्यमुपसङ्गम्य राजा वचनमब्रवीत् ॥',
            hi: 'संजय बोले - उस समय राजा दुर्योधन ने पाण्डवों की सेना को व्यूह रचना में खड़ी देखकर, द्रोणाचार्य के पास जाकर यह वचन कहा।',
            en: 'Sanjaya said: Having seen the army of the Pandavas drawn up in battle formation, King Duryodhana then approached his teacher Drona and spoke these words.'
          },
          {
            num: 3,
            sa: 'पश्यैतां पाण्डुपुत्राणामाचार्य महतीं चमूम् ।\nव्यूढां द्रुपदपुत्रेण तव शिष्येण धीमता ॥',
            hi: 'हे आचार्य! आपके प्रतिभाशाली शिष्य द्रुपद-पुत्र (धृष्टद्युम्न) द्वारा व्यूह-बद्ध की गई पाण्डु-पुत्रों की इस विशाल सेना को देखिए।',
            en: 'Behold, O teacher, this mighty army of the sons of Pandu, arrayed for battle by your own gifted pupil, the son of Drupada.'
          },
          {
            num: 4,
            sa: 'अत्र शूरा महेष्वासा भीमार्जुनसमा युधि ।\nयुयुधानो विराटश्च द्रुपदश्च महारथः ॥',
            hi: 'इस सेना में भीम और अर्जुन के समान युद्ध करने वाले शूरवीर धनुर्धर हैं - युयुधान (सात्यकि), विराट और महारथी द्रुपद।',
            en: 'Here are heroes, mighty archers, equal in battle to Bhima and Arjuna - Yuyudhana, Virata, and the great warrior Drupada.'
          },
          {
            num: 5,
            sa: 'धृष्टकेतुश्चेकितानः काशिराजश्च वीर्यवान् ।\nपुरुजित्कुन्तिभोजश्च शैब्यश्च नरपुङ्गवः ॥',
            hi: 'धृष्टकेतु, चेकितान, पराक्रमी काशिराज, पुरुजित्, कुन्तिभोज और नरश्रेष्ठ शैब्य भी हैं।',
            en: 'Dhrishtaketu, Chekitana, the valiant king of Kashi, Purujit, Kuntibhoja, and Shaibya, best among men.'
          },
          {
            num: 6,
            sa: 'युधामन्युश्च विक्रान्त उत्तमौजाश्च वीर्यवान् ।\nसौभद्रो द्रौपदेयाश्च सर्व एव महारथाः ॥',
            hi: 'पराक्रमी युधामन्यु, बलवान उत्तमौजा, सुभद्रा-पुत्र (अभिमन्यु) तथा द्रौपदी के पुत्र - ये सब महारथी हैं।',
            en: 'The mighty Yudhamanyu, the valiant Uttamaujas, the son of Subhadra, and the sons of Draupadi - all of them great chariot-warriors.'
          },
          {
            num: 7,
            sa: 'अस्माकं तु विशिष्टा ये तान्निबोध द्विजोत्तम ।\nनायका मम सैन्यस्य संज्ञार्थं तान्ब्रवीमि ते ॥',
            hi: 'हे द्विजोत्तम! अब आप हमारे पक्ष के प्रमुख योद्धाओं को भी जान लीजिए। आपकी जानकारी के लिए मैं अपनी सेना के सेनापतियों के नाम बताता हूँ।',
            en: 'O best of the twice-born, know also the outstanding leaders on our side; for your information, I name the commanders of my army.'
          },
          {
            num: 8,
            sa: 'भवान्भीष्मश्च कर्णश्च कृपश्च समितिञ्जयः ।\nअश्वत्थामा विकर्णश्च सौमदत्तिस्तथैव च ॥',
            hi: 'आप स्वयं, भीष्म पितामह, कर्ण, संग्राम-विजयी कृप, अश्वत्थामा, विकर्ण तथा सोमदत्त-पुत्र (भूरिश्रवा) - ये सब हैं।',
            en: 'Yourself, and Bhishma, and Karna, and Kripa who is ever victorious in battle, Ashvatthama, Vikarna, and the son of Somadatta.'
          },
          {
            num: 9,
            sa: 'अन्ये च बहवः शूरा मदर्थे त्यक्तजीविताः ।\nनानाशस्त्रप्रहरणाः सर्वे युद्धविशारदाः ॥',
            hi: 'इनके अतिरिक्त मेरे लिए अपने प्राण त्यागने को तैयार अनेक शूरवीर भी हैं, जो नाना प्रकार के शस्त्रों से सुसज्जित और युद्ध-कुशल हैं।',
            en: 'And many other heroes too, who are ready to give up their lives for my sake, armed with many kinds of weapons, all skilled in warfare.'
          },
          {
            num: 10,
            sa: 'अपर्याप्तं तदस्माकं बलं भीष्माभिरक्षितम् ।\nपर्याप्तं त्विदमेतेषां बलं भीमाभिरक्षितम् ॥',
            hi: 'भीष्म पितामह द्वारा रक्षित हमारी यह सेना अपर्याप्त (असीमित) है, जबकि भीम द्वारा रक्षित उनकी वह सेना पर्याप्त (सीमित) है।',
            en: 'This army of ours, protected by Bhishma, is unlimited (more than sufficient), while that army of theirs, protected by Bhima, is limited.'
          },
          {
            num: 11,
            sa: 'अयनेषु च सर्वेषु यथाभागमवस्थिताः ।\nभीष्ममेवाभिरक्षन्तु भवन्तः सर्व एव हि ॥',
            hi: 'इसलिए आप सब लोग अपनी-अपनी मोर्चों पर दृढ़ता से खड़े रहकर भीष्म पितामह की ही चारों ओर से रक्षा करें।',
            en: 'Therefore, all of you, standing firm in your respective positions at every entrance of the array, protect Bhishma alone.'
          },
          {
            num: 12,
            sa: 'तस्य सञ्जनयन्हर्षं कुरुवृद्धः पितामहः ।\nसिंहनादं विनद्योच्चैः शङ्खं दध्मौ प्रतापवान् ॥',
            hi: 'तब कुरुवृद्ध पितामह भीष्म ने सिंह के समान गर्जना करते हुए उच्च स्वर में शंख बजाकर दुर्योधन को हर्षित किया।',
            en: 'Then the aged Kuru elder, the grandsire Bhishma, roaring aloud like a lion, blew his conch, gladdening Duryodhana\'s heart.'
          },
          {
            num: 13,
            sa: 'ततः शङ्खाश्च भेर्यश्च पणवानकगोमुखाः ।\nसहसैवाभ्यहन्यन्त स शब्दस्तुमुलोऽभवत् ॥',
            hi: 'इसके पश्चात शंख, नगाड़े, ढोल, मृदंग और नरसिंघे एक साथ बज उठे, जिनका वह शब्द अत्यंत भयंकर हुआ।',
            en: 'Thereafter conches, kettledrums, cymbals, drums, and horns suddenly blared out together, and the sound was tumultuous.'
          },
          {
            num: 14,
            sa: 'ततः श्वेतैर्हयैर्युक्ते महति स्यन्दने स्थितौ ।\nमाधवः पाण्डवश्चैव दिव्यौ शङ्खौ प्रदध्मतुः ॥',
            hi: 'इसके बाद श्वेत घोड़ों से जुते हुए विशाल रथ में बैठे हुए माधव (श्रीकृष्ण) और पाण्डव (अर्जुन) ने भी अपने दिव्य शंख बजाए।',
            en: 'Then, seated in a great chariot yoked to white horses, Krishna (Madhava) and Arjuna (the son of Pandu) blew their divine conches.'
          },
          {
            num: 15,
            sa: 'पाञ्चजन्यं हृषीकेशो देवदत्तं धनञ्जयः ।\nपौण्ड्रं दध्मौ महाशङ्खं भीमकर्मा वृकोदरः ॥',
            hi: 'श्रीकृष्ण ने पाञ्चजन्य नामक शंख बजाया, अर्जुन ने देवदत्त नामक शंख बजाया, और भयंकर कर्म करने वाले भीम ने पौण्ड्र नामक महाशंख बजाया।',
            en: 'Krishna blew his conch called Panchajanya, Arjuna blew the Devadatta, and Bhima, the doer of terrible deeds, blew the great conch Paundra.'
          },
          {
            num: 16,
            sa: 'अनन्तविजयं राजा कुन्तीपुत्रो युधिष्ठिरः ।\nनकुलः सहदेवश्च सुघोषमणिपुष्पकौ ॥',
            hi: 'कुन्तीपुत्र राजा युधिष्ठिर ने अनन्तविजय शंख बजाया, तथा नकुल और सहदेव ने क्रमशः सुघोष और मणिपुष्पक शंख बजाए।',
            en: 'King Yudhishthira, the son of Kunti, blew the Anantavijaya, while Nakula and Sahadeva blew the Sughosha and Manipushpaka.'
          },
          {
            num: 17,
            sa: 'काश्यश्च परमेष्वासः शिखण्डी च महारथः ।\nधृष्टद्युम्नो विराटश्च सात्यकिश्चापराजितः ॥',
            hi: 'श्रेष्ठ धनुर्धर काशिराज, महारथी शिखण्डी, धृष्टद्युम्न, विराट तथा अजेय सात्यकि,',
            en: 'The excellent archer, the king of Kashi, the great warrior Shikhandi, Dhrishtadyumna, Virata, and the unconquered Satyaki,'
          },
          {
            num: 18,
            sa: 'द्रुपदो द्रौपदेयाश्च सर्वशः पृथिवीपते ।\nसौभद्रश्च महाबाहुः शङ्खान्दध्मुः पृथक्पृथक् ॥',
            hi: 'हे पृथ्वीपते! द्रुपद, द्रौपदी के पुत्र और महाबाहु सुभद्रा-पुत्र (अभिमन्यु) - इन सबने भी अपने-अपने शंख बजाए।',
            en: 'O lord of the earth, Drupada, the sons of Draupadi, and the mighty-armed son of Subhadra - all of them blew their respective conches.'
          },
          {
            num: 19,
            sa: 'स घोषो धार्तराष्ट्राणां हृदयानि व्यदारयत् ।\nनभश्च पृथिवीं चैव तुमुलोऽभ्यनुनादयन् ॥',
            hi: 'उस भयंकर शब्द ने आकाश और पृथ्वी को गुंजाते हुए धृतराष्ट्र के पुत्रों के हृदय विदीर्ण कर दिए।',
            en: 'That tumultuous sound, reverberating through the sky and the earth, tore the hearts of the sons of Dhritarashtra.'
          },
          {
            num: 20,
            sa: 'अथ व्यवस्थितान्दृष्ट्वा धार्तराष्ट्रान् कपिध्वजः ।\nप्रवृत्ते शस्त्रसम्पाते धनुरुद्यम्य पाण्डवः ।\nहृषीकेशं तदा वाक्यमिदमाह महीपते ॥',
            hi: 'हे राजन्! उस समय अपनी सेना को व्यूह-बद्ध देखकर तथा शस्त्र चलने की तैयारी होते देख, कपिध्वज अर्जुन ने अपना धनुष उठाकर श्रीकृष्ण से यह वचन कहा।',
            en: 'O King, then, seeing the sons of Dhritarashtra arrayed and the discharge of weapons about to begin, Arjuna, whose banner bore the emblem of Hanuman, took up his bow and spoke these words to Krishna.'
          },
          {
            num: 21,
            speaker: { hi: 'अर्जुन उवाच', en: 'Arjuna said' },
            sa: 'सेनयोरुभयोर्मध्ये रथं स्थापय मेऽच्युत ॥',
            hi: 'अर्जुन बोले - हे अच्युत! मेरे रथ को दोनों सेनाओं के बीच में खड़ा कीजिए,',
            en: 'Arjuna said: O Achyuta, please place my chariot between the two armies,'
          },
          {
            num: 22,
            sa: 'यावदेतान्निरीक्षेऽहं योद्धुकामानवस्थितान् ।\nकैर्मया सह योद्धव्यमस्मिन् रणसमुद्यमे ॥',
            hi: 'जिससे मैं युद्ध की इच्छा से खड़े इन योद्धाओं को अच्छी तरह देख सकूँ कि इस युद्ध में मुझे किन-किन के साथ युद्ध करना है।',
            en: 'so that I may behold those who stand here eager for battle, those with whom I must contend in this coming fight.'
          },
          {
            num: 23,
            sa: 'योत्स्यमानानवेक्षेऽहं य एतेऽत्र समागताः ।\nधार्तराष्ट्रस्य दुर्बुद्धेर्युद्धे प्रियचिकीर्षवः ॥',
            hi: 'दुर्बुद्धि दुर्योधन का युद्ध में प्रिय करने की इच्छा से जो-जो यहाँ एकत्र हुए हैं, उन युद्ध करने वालों को मैं देखना चाहता हूँ।',
            en: 'I wish to look upon those who have gathered here to fight, wishing to please the evil-minded son of Dhritarashtra.'
          },
          {
            num: 24,
            speaker: { hi: 'संजय उवाच', en: 'Sanjaya said' },
            sa: 'एवमुक्तो हृषीकेशो गुडाकेशेन भारत ।\nसेनयोरुभयोर्मध्ये स्थापयित्वा रथोत्तमम् ॥',
            hi: 'संजय बोले - हे भरतवंशी (धृतराष्ट्र)! गुडाकेश (अर्जुन) के इस प्रकार कहने पर श्रीकृष्ण ने दोनों सेनाओं के बीच उस उत्तम रथ को खड़ा करके,',
            en: 'Sanjaya said: O Bharata, thus addressed by Arjuna, Krishna drove that magnificent chariot and stationed it between the two armies,'
          },
          {
            num: 25,
            sa: 'भीष्मद्रोणप्रमुखतः सर्वेषां च महीक्षिताम् ।\nउवाच पार्थ पश्यैतान्समवेतान्कुरूनिति ॥',
            hi: 'भीष्म, द्रोण तथा सभी राजाओं के सामने कहा - हे पार्थ! यहाँ एकत्र हुए इन सब कुरुवंशियों को देखो।',
            en: 'and, facing Bhishma, Drona, and all the rulers of the earth, said: O Partha, behold these Kurus assembled here.'
          },
          {
            num: 26,
            sa: 'तत्रापश्यत्स्थितान्पार्थः पितॄनथ पितामहान् ।\nआचार्यान्मातुलान्भ्रातॄन्पुत्रान्पौत्रान्सखींस्तथा ॥',
            hi: 'वहाँ पार्थ ने दोनों सेनाओं में स्थित अपने चाचा-ताऊ, दादा-परदादा, गुरुजन, मामा, भाई, पुत्र, पौत्र, मित्र,',
            en: 'There Arjuna saw, standing in both armies, his fathers and grandfathers, teachers, maternal uncles, brothers, sons, grandsons, and friends,'
          },
          {
            num: 27,
            sa: 'श्वशुरान्सुहृदश्चैव सेनयोरुभयोरपि ।\nतान्समीक्ष्य स कौन्तेयः सर्वान्बन्धूनवस्थितान् ॥',
            hi: 'ससुर तथा हितैषियों को भी देखा। उन सब बन्धुओं को इस प्रकार खड़े देखकर कुन्तीपुत्र अर्जुन,',
            en: 'his fathers-in-law too, and well-wishers - seeing all these kinsmen arrayed before him, the son of Kunti,'
          },
          {
            num: 28,
            speaker: { hi: 'अर्जुन उवाच', en: 'Arjuna said' },
            sa: 'कृपया परयाविष्टो विषीदन्निदमब्रवीत् ।\nदृष्ट्वेमं स्वजनं कृष्ण युयुत्सुं समुपस्थितम् ॥',
            hi: 'अर्जुन बोले - अत्यंत करुणा से भरकर शोकमग्न होकर बोले - हे कृष्ण! युद्ध करने की इच्छा से खड़े इन अपने ही स्वजनों को देखकर,',
            en: 'Arjuna said, overcome with deep compassion and sorrow: O Krishna, seeing my own kinsmen standing here, eager to fight,'
          },
          {
            num: 29,
            sa: 'सीदन्ति मम गात्राणि मुखं च परिशुष्यति ।\nवेपथुश्च शरीरे मे रोमहर्षश्च जायते ॥',
            hi: 'मेरे अंग शिथिल हुए जा रहे हैं, मुँह सूख रहा है, शरीर काँप रहा है और रोंगटे खड़े हो रहे हैं।',
            en: 'my limbs give way, my mouth is drying up, my body trembles, and my hair stands on end.'
          },
          {
            num: 30,
            sa: 'गाण्डीवं स्रंसते हस्तात्त्वक्चैव परिदह्यते ।\nन च शक्नोम्यवस्थातुं भ्रमतीव च मे मनः ॥',
            hi: 'हाथ से गाण्डीव धनुष गिर रहा है, त्वचा जल रही है, मैं खड़ा भी नहीं रह पा रहा और मेरा मन मानो भ्रमित हो रहा है।',
            en: 'The bow Gandiva slips from my hand, my skin is burning all over; I am unable to stand steady, and my mind seems to be reeling.'
          },
          {
            num: 31,
            sa: 'निमित्तानि च पश्यामि विपरीतानि केशव ।\nन च श्रेयोऽनुपश्यामि हत्वा स्वजनमाहवे ॥',
            hi: 'हे केशव! मुझे अपशकुन भी दिखाई दे रहे हैं, और युद्ध में अपने ही स्वजनों को मारकर मुझे कोई कल्याण होता नहीं दिखता।',
            en: 'I see evil omens, O Keshava, and I foresee no good in killing my own kinsmen in this battle.'
          },
          {
            num: 32,
            sa: 'न काङ्क्षे विजयं कृष्ण न च राज्यं सुखानि च ।\nकिं नो राज्येन गोविन्द किं भोगैर्जीवितेन वा ॥',
            hi: 'हे कृष्ण! न तो मैं विजय चाहता हूँ, न राज्य और न ही सुख। हे गोविन्द! ऐसे राज्य से, भोगों से अथवा जीवन से भी हमें क्या लाभ?',
            en: 'I do not desire victory, O Krishna, nor kingdom, nor pleasures. Of what use to us is kingdom, or enjoyment, or even life itself, O Govinda?'
          },
          {
            num: 33,
            sa: 'येषामर्थे काङ्क्षितं नो राज्यं भोगाः सुखानि च ।\nत इमेऽवस्थिता युद्धे प्राणांस्त्यक्त्वा धनानि च ॥',
            hi: 'जिनके लिए हम राज्य, भोग और सुख चाहते हैं, वे ही सब अपने प्राणों और धन का मोह त्यागकर इस युद्ध में खड़े हैं -',
            en: 'Those for whose sake we desire kingdom, enjoyment, and pleasures stand here in battle, having given up their wealth and even their lives -'
          },
          {
            num: 34,
            sa: 'आचार्याः पितरः पुत्रास्तथैव च पितामहाः ।\nमातुलाः श्वशुराः पौत्राः श्यालाः सम्बन्धिनस्तथा ॥',
            hi: 'गुरुजन, पिता, पुत्र, दादा, मामा, ससुर, पौत्र, साले तथा अन्य सम्बन्धी।',
            en: 'teachers, fathers, sons, and grandfathers too; maternal uncles, fathers-in-law, grandsons, brothers-in-law, and other relatives.'
          },
          {
            num: 35,
            sa: 'एतान्न हन्तुमिच्छामि घ्नतोऽपि मधुसूदन ।\nअपि त्रैलोक्यराज्यस्य हेतोः किं नु महीकृते ॥',
            hi: 'हे मधुसूदन! ये मुझे मार डालें, तब भी मैं इन्हें मारना नहीं चाहता - चाहे तीनों लोकों के राज्य के बदले में ही क्यों न हो, फिर पृथ्वी के राज्य की तो बात ही क्या!',
            en: 'O Madhusudana, I do not wish to kill these, even if they were to kill me - not even for the sovereignty of the three worlds, how much less for this earth!'
          },
          {
            num: 36,
            sa: 'निहत्य धार्तराष्ट्रान्नः का प्रीतिः स्याज्जनार्दन ।\nपापमेवाश्रयेदस्मान्हत्वैतानाततायिनः ॥',
            hi: 'हे जनार्दन! धृतराष्ट्र के पुत्रों को मारकर हमें क्या प्रसन्नता मिलेगी? इन आततायियों को मारने से हमें पाप ही लगेगा।',
            en: 'O Janardana, what joy would we gain by killing the sons of Dhritarashtra? Only sin would come to us by killing these aggressors.'
          },
          {
            num: 37,
            sa: 'तस्मान्नार्हा वयं हन्तुं धार्तराष्ट्रान्स्वबान्धवान् ।\nस्वजनं हि कथं हत्वा सुखिनः स्याम माधव ॥',
            hi: 'इसलिए हम अपने ही बान्धव धृतराष्ट्र के पुत्रों को मारने योग्य नहीं हैं। हे माधव! अपने ही स्वजनों को मारकर हम कैसे सुखी हो सकते हैं?',
            en: 'Therefore we ought not to kill our own kinsmen, the sons of Dhritarashtra. O Madhava, how could we ever be happy after killing our own people?'
          },
          {
            num: 38,
            sa: 'यद्यप्येते न पश्यन्ति लोभोपहतचेतसः ।\nकुलक्षयकृतं दोषं मित्रद्रोहे च पातकम् ॥',
            hi: 'यद्यपि लोभ से जिनकी बुद्धि नष्ट हो गई है, वे कुल के नाश से होने वाले दोष और मित्रों से द्रोह करने के पाप को नहीं देखते,',
            en: 'Even though these men, their minds overpowered by greed, see no wrong in destroying their own family or in treachery towards friends,'
          },
          {
            num: 39,
            sa: 'कथं न ज्ञेयमस्माभिः पापादस्मान्निवर्तितुम् ।\nकुलक्षयकृतं दोषं प्रपश्यद्भिर्जनार्दन ॥',
            hi: 'किन्तु हे जनार्दन! कुल के नाश से होने वाले इस दोष को स्पष्ट देखते हुए भी हमें इस पाप से बचने का विचार क्यों नहीं करना चाहिए?',
            en: 'why should we, O Janardana, who clearly see the evil in destroying a family, not turn away from this sin?'
          },
          {
            num: 40,
            sa: 'कुलक्षये प्रणश्यन्ति कुलधर्माः सनातनाः ।\nधर्मे नष्टे कुलं कृत्स्नमधर्मोऽभिभवत्युत ॥',
            hi: 'कुल के नाश से सनातन कुल-धर्म नष्ट हो जाते हैं, और धर्म के नष्ट होने पर सारे कुल में अधर्म फैल जाता है।',
            en: 'With the destruction of a family, its ancient, eternal traditions perish; and when righteousness is lost, unrighteousness overtakes the entire family.'
          },
          {
            num: 41,
            sa: 'अधर्माभिभवात्कृष्ण प्रदुष्यन्ति कुलस्त्रियः ।\nस्त्रीषु दुष्टासु वार्ष्णेय जायते वर्णसङ्करः ॥',
            hi: 'हे कृष्ण! अधर्म के बढ़ने से कुल की स्त्रियाँ दूषित हो जाती हैं, और हे वार्ष्णेय! स्त्रियों के दूषित होने पर वर्ण-संकर संतान उत्पन्न होती है।',
            en: 'O Krishna, when unrighteousness prevails, the women of the family become corrupted; and when women are corrupted, O descendant of Vrishni, an unwanted mixing of castes arises.'
          },
          {
            num: 42,
            sa: 'सङ्करो नरकायैव कुलघ्नानां कुलस्य च ।\nपतन्ति पितरो ह्येषां लुप्तपिण्डोदकक्रियाः ॥',
            hi: 'यह वर्ण-संकर कुल का नाश करने वालों को तथा कुल को भी नरक में ले जाने वाला होता है। पिण्ड और जल न मिलने से इनके पितर भी अधोगति को प्राप्त होते हैं।',
            en: 'Such intermixture leads to hell both for the destroyers of the family and for the family itself; deprived of offerings of rice and water, their ancestors fall from their place.'
          },
          {
            num: 43,
            sa: 'दोषैरेतैः कुलघ्नानां वर्णसङ्करकारकैः ।\nउत्साद्यन्ते जातिधर्माः कुलधर्माश्च शाश्वताः ॥',
            hi: 'कुल का नाश करने वाले इन दोषों से वर्ण-संकर उत्पन्न होता है, जिससे सनातन कुल-धर्म और जाति-धर्म नष्ट हो जाते हैं।',
            en: 'By these wrongs of the destroyers of the family, which give rise to unwanted intermixture, the eternal traditions of the community and family are destroyed.'
          },
          {
            num: 44,
            sa: 'उत्सन्नकुलधर्माणां मनुष्याणां जनार्दन ।\nनरके नियतं वासो भवतीत्यनुशुश्रुम ॥',
            hi: 'हे जनार्दन! हमने सुना है कि जिन मनुष्यों के कुल-धर्म नष्ट हो जाते हैं, उन्हें निश्चय ही नरक में वास करना पड़ता है।',
            en: 'We have heard, O Janardana, that men whose family traditions are destroyed are destined to dwell in hell.'
          },
          {
            num: 45,
            sa: 'अहो बत महत्पापं कर्तुं व्यवसिता वयम् ।\nयद्राज्यसुखलोभेन हन्तुं स्वजनमुद्यताः ॥',
            hi: 'हाय! कितने आश्चर्य की बात है कि हम बड़ा भारी पाप करने पर उतारू हो गए हैं, जो राज्य-सुख के लोभ में अपने ही स्वजनों को मारने चले हैं।',
            en: 'Alas, what a great sin we are resolved to commit, in that, driven by greed for the pleasures of a kingdom, we are prepared to kill our own kinsmen.'
          },
          {
            num: 46,
            sa: 'यदि मामप्रतीकारमशस्त्रं शस्त्रपाणयः ।\nधार्तराष्ट्रा रणे हन्युस्तन्मे क्षेमतरं भवेत् ॥',
            hi: 'यदि शस्त्रधारी धृतराष्ट्र के पुत्र निःशस्त्र और बिना विरोध किए हुए मुझे युद्ध में मार डालें, तो वह भी मेरे लिए अधिक कल्याणकारी होगा।',
            en: 'If the armed sons of Dhritarashtra were to kill me in battle, unarmed and unresisting, that would be far better for me.'
          },
          {
            num: 47,
            speaker: { hi: 'संजय उवाच', en: 'Sanjaya said' },
            sa: 'एवमुक्त्वार्जुनः सङ्ख्ये रथोपस्थ उपाविशत् ।\nविसृज्य सशरं चापं शोकसंविग्नमानसः ॥',
            hi: 'संजय बोले - युद्धभूमि में इस प्रकार कहकर शोक से व्याकुल मन वाले अर्जुन बाण सहित धनुष को त्यागकर रथ के पिछले भाग में बैठ गए।',
            en: 'Sanjaya said: Having spoken thus on the battlefield, Arjuna, his mind overwhelmed with grief, cast aside his bow and arrow and sank down onto the seat of his chariot.'
          }
        ]
      }
    }
  }
};
