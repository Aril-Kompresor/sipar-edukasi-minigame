export interface AbQuizQuestion {
  id: string;
  text: string;
  options: [string, string];
  correct: 0 | 1;
  explanation: string;
}

export interface KlasterInfo {
  id: number;
  code: string;
  title: string;
  shortTitle: string;
  summary: string;
  stageTheme: {
    name: string;
    subtitle: string;
  };
  questions: AbQuizQuestion[];
}

export const UMUM_KLASTER_ID = 6;

export function getKlasterLabel(klasterId: number): string {
  if (klasterId === UMUM_KLASTER_ID) return 'Umum';
  const found = KLASTER_DATA.find((k) => k.id === klasterId);
  return found ? found.code : `Klaster ${klasterId}`;
}

export const KLASTER_DATA: KlasterInfo[] = [
  {
    id: 1,
    code: 'Klaster 1',
    title: 'Hak Sipil dan Kebebasan',
    shortTitle: 'Hak Sipil',
    summary:
      'Hak identitas resmi anak sejak lahir (Akta Kelahiran dan KIA), kebebasan menyampaikan pendapat melalui Forum Anak, serta perlindungan privasi anak.',
    stageTheme: {
      name: 'Awan dan Angkasa Kebebasan',
      subtitle: 'Stage Klaster 1'
    },
    questions: [
      {
        id: 'k1-q1',
        text: 'Akta Kelahiran adalah dokumen resmi pertama yang menjadi bukti sah identitas dan kewarganegaraan seorang anak sejak lahir.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Akta Kelahiran adalah bukti identitas hukum pertama anak sejak lahir untuk memperoleh pengakuan negara dan layanan publik.'
      },
      {
        id: 'k1-q2',
        text: 'Kartu Identitas Anak (KIA) hanya boleh dimiliki oleh anak yang sudah berusia 17 tahun ke atas.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Kartu Identitas Anak (KIA) justru diterbitkan untuk anak usia 0 hingga sebelum 17 tahun sebelum memiliki KTP elektronik.'
      },
      {
        id: 'k1-q3',
        text: 'Forum Anak berperan sebagai Pelopor dan Pelapor (2P) yang menyuarakan aspirasi anak dalam pembangunan daerah.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Forum Anak menjadi wadah resmi partisipasi anak sebagai Pelopor dan Pelapor (2P) dalam menyampaikan suara anak.'
      },
      {
        id: 'k1-q4',
        text: 'Anak berhak mendapatkan perlindungan dari publikasi identitas pribadi secara sembarangan di media sosial atau berita.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Hak atas privasi melindungi data diri, foto, dan identitas anak agar tidak disalahgunakan atau membahayakan keselamatannya.'
      },
      {
        id: 'k1-q5',
        text: 'Pembuatan Akta Kelahiran di Dinas Kependudukan dan Pencatatan Sipil dikenakan biaya administrasi resmi yang mahal.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Pengurusan Akta Kelahiran dan KIA di Disdukcapil bersifat gratis tanpa dipungut biaya retribusi.'
      },
      {
        id: 'k1-q6',
        text: 'Anak memiliki hak untuk mencari, menerima, dan menyampaikan informasi yang layak sesuai usia dan perkembangannya.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Konvensi Hak Anak menjamin kebebasan anak memperoleh informasi yang sehat, edukatif, dan sesuai tingkat usianya.'
      },
      {
        id: 'k1-q7',
        text: 'Pendapat anak tidak perlu didengar dalam Musrenbang karena keputusan daerah hanya urusan orang dewasa.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Dalam Kota Layak Anak (KLA), suara anak wajib didengar melalui keterlibatan Forum Anak di forum Musrenbang.'
      },
      {
        id: 'k1-q8',
        text: 'Kebebasan beragama dan beribadah sesuai keyakinan juga merupakan bagian dari hak sipil anak yang dilindungi negara.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Setiap anak berhak memeluk agama dan beribadah dengan tenang serta mendapatkan bimbingan dari keluarganya.'
      },
      {
        id: 'k1-q9',
        text: 'Anak yang baru lahir dari keluarga tidak mampu tidak berhak memiliki nama dan kewarganegaraan yang tercatat negara.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Setiap anak tanpa diskriminasi status ekonomi berhak atas nama, identitas hukum, dan kewarganegaraan sejak dilahirkan.'
      },
      {
        id: 'k1-q10',
        text: 'Informasi Layak Anak (ILA) bertujuan memastikan anak terhindar dari konten kekerasan, pornografi, dan hoaks.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Layanan Informasi Layak Anak hadir melalui perpustakaan, media ramah anak, dan ruang baca aman dari konten berbahaya.'
      }
    ]
  },
  {
    id: 2,
    code: 'Klaster 2',
    title: 'Lingkungan Keluarga dan Pengasuhan Alternatif',
    shortTitle: 'Pengasuhan',
    summary:
      'Hak anak memperoleh pengasuhan penuh kasih sayang di lingkungan keluarga tanpa kekerasan, pencegahan perkawinan anak, dan pengasuhan alternatif terbaik.',
    stageTheme: {
      name: 'Rumah dan Tangga Kayu',
      subtitle: 'Stage Klaster 2'
    },
    questions: [
      {
        id: 'k2-q1',
        text: 'Berdasarkan UU No. 16 Tahun 2019, batas usia minimal perkawinan bagi laki-laki dan perempuan di Indonesia adalah 19 tahun.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'UU No. 16 Tahun 2019 menetapkan usia minimal perkawinan 19 tahun bagi laki-laki dan perempuan untuk mencegah perkawinan anak.'
      },
      {
        id: 'k2-q2',
        text: 'Prinsip utama dalam menentukan pengasuhan alternatif bagi anak adalah keinginan sepihak pengurus panti asuhan.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Prinsip utama pengasuhan alternatif adalah kepentingan terbaik bagi anak (Best Interests of the Child).'
      },
      {
        id: 'k2-q3',
        text: 'Pengasuhan di dalam keluarga inti yang penuh kasih sayang merupakan lingkungan terbaik bagi tumbuh kembang anak.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Keluarga adalah lingkungan pengasuhan utama yang paling mendukung rasa aman, kasih sayang, dan perkembangan emosi anak.'
      },
      {
        id: 'k2-q4',
        text: 'Hukuman fisik atau bentakan keras di rumah adalah cara mendidik yang dibenarkan demi kedisiplinan anak.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Kekerasan fisik maupun verbal melanggar hak anak; pengasuhan positif mengutamakan dialog, keteladanan, dan batasan yang aman.'
      },
      {
        id: 'k2-q5',
        text: 'Lembaga Konsultasi Kesejahteraan Keluarga (LK3) atau PUSPAGA membantu orang tua meningkatkan keterampilan pengasuhan anak.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'PUSPAGA dan layanan konseling keluarga membantu orang tua menerapkan pengasuhan positif dan mencegah konflik keluarga.'
      },
      {
        id: 'k2-q6',
        text: 'Perkawinan usia anak berisiko tinggi menyebabkan putus sekolah, masalah kesehatan reproduksi, dan kemiskinan antargenerasi.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Perkawinan anak merampas hak pendidikan, membahayakan kesehatan ibu dan bayi, serta meningkatkan kerentanan ekonomi.'
      },
      {
        id: 'k2-q7',
        text: 'Anak yang orang tuanya berpisah kehilangan hak untuk tetap berhubungan baik dengan kedua orang tuanya.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Meskipun orang tua berpisah, anak tetap berhak mendapatkan kasih sayang dan hubungan berkelanjutan dengan kedua orang tuanya.'
      },
      {
        id: 'k2-q8',
        text: 'Pengasuhan di panti atau Lembaga Kesejahteraan Sosial Anak (LKSA) merupakan pilihan terakhir jika pengasuhan keluarga tidak memungkinkan.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Pengasuhan berbasis keluarga (kerabat atau orang tua asuh) selalu diutamakan sebelum pengasuhan di lembaga.'
      },
      {
        id: 'k2-q9',
        text: 'Orang tua boleh menelantarkan anak jika merasa sibuk bekerja mencari nafkah.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Menelantarkan kebutuhan dasar, perhatian, dan keamanan anak adalah bentuk pelanggaran hak dan perlindungan anak.'
      },
      {
        id: 'k2-q10',
        text: 'Komunikasi terbuka antara orang tua dan anak membantu mencegah anak terjerumus pada pergaulan berisiko.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Hubungan keluarga yang hangat dan komunikatif membuat anak merasa aman bercerita saat menghadapi masalah.'
      }
    ]
  },
  {
    id: 3,
    code: 'Klaster 3',
    title: 'Kesehatan Dasar dan Kesejahteraan',
    shortTitle: 'Kesehatan',
    summary:
      'Pemenuhan gizi seimbang, imunisasi dasar lengkap, sanitasi sehat, dan pencegahan stunting pada 1000 Hari Pertama Kehidupan (HPK).',
    stageTheme: {
      name: 'Pohon Apel Sehat',
      subtitle: 'Stage Klaster 3'
    },
    questions: [
      {
        id: 'k3-q1',
        text: 'Periode emas pencegahan stunting sejak masa janin hingga anak berusia 2 tahun disebut 1000 Hari Pertama Kehidupan (1000 HPK).',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          '1000 HPK merupakan periode kritis pembentukan organ vital, pertumbuhan fisik, dan perkembangan otak anak.'
      },
      {
        id: 'k3-q2',
        text: 'Pemberian ASI eksklusif selama 6 bulan pertama kehidupan dapat digantikan sepenuhnya oleh air putih atau teh manis.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Bayi usia 0 sampai 6 bulan hanya membutuhkan ASI eksklusif tanpa tambahan air putih atau makanan lain agar gizi dan imunnya optimal.'
      },
      {
        id: 'k3-q3',
        text: 'MPASI yang kaya protein hewani seperti ikan, telur, dan daging penting untuk mencegah stunting dan anemia pada balita.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Protein hewani mengandung asam amino esensial dan zat besi yang sangat dibutuhkan untuk pertumbuhan tinggi badan dan otak.'
      },
      {
        id: 'k3-q4',
        text: 'Imunisasi dasar lengkap tidak diperlukan jika anak terlihat aktif dan jarang keluar rumah.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Imunisasi dasar lengkap wajib diberikan untuk membentuk kekebalan tubuh terhadap penyakit menular berbahaya seperti polio dan campak.'
      },
      {
        id: 'k3-q5',
        text: 'Posyandu dan Puskesmas Ramah Anak berperan memantau pertumbuhan berat dan tinggi badan anak secara berkala.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Pemantauan rutin di Posyandu membantu mendeteksi dini gangguan gizi atau risiko stunting agar segera ditangani.'
      },
      {
        id: 'k3-q6',
        text: 'Kawasan Tanpa Rokok (KTR) di sekolah dan ruang publik anak membantu melindungi anak dari bahaya asap rokok.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Paparan asap rokok (perokok pasif) mengganggu pernapasan anak dan menghambat penyerapan gizi serta pertumbuhan.'
      },
      {
        id: 'k3-q7',
        text: 'Ketersediaan air bersih dan sanitasi yang layak tidak berpengaruh terhadap kondisi gizi dan kesehatan anak.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Air bersih dan sanitasi mencegah diare serta infeksi berulang yang menjadi salah satu penyebab utama stunting pada anak.'
      },
      {
        id: 'k3-q8',
        text: 'Kesehatan mental remaja sama pentingnya dengan kesehatan fisik dalam pemenuhan kesejahteraan anak.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Kesejahteraan anak mencakup kesehatan jasmani dan rohani, termasuk dukungan psikologis saat remaja menghadapi tekanan.'
      },
      {
        id: 'k3-q9',
        text: 'Tablet Tambah Darah (TTD) bagi remaja putri diberikan untuk mencegah anemia sejak dini.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Pencegahan anemia pada remaja putri menjaga konsentrasi belajar sekaligus menyiapkan generasi sehat di masa depan.'
      },
      {
        id: 'k3-q10',
        text: 'Stunting adalah kondisi gagal tumbuh yang hanya memengaruhi tinggi badan tanpa berdampak pada kecerdasan otak.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Stunting berdampak jangka panjang pada perkembangan kognitif, daya belajar, dan imunitas anak, bukan sekadar tinggi badan.'
      }
    ]
  },
  {
    id: 4,
    code: 'Klaster 4',
    title: 'Pendidikan, Waktu Luang, dan Kegiatan Budaya',
    shortTitle: 'Pendidikan',
    summary:
      'Mewujudkan Sekolah Ramah Anak (SRA) bebas perundungan serta pemenuhan hak anak untuk istirahat, bermain, dan berkegiatan budaya.',
    stageTheme: {
      name: 'Tangga Buku dan Istana Belajar',
      subtitle: 'Stage Klaster 4'
    },
    questions: [
      {
        id: 'k4-q1',
        text: 'Sekolah Ramah Anak (SRA) adalah satuan pendidikan yang menjamin lingkungan belajar aman, bersih, sehat, dan bebas perundungan.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Sekolah Ramah Anak memastikan pemenuhan hak anak di sekolah tanpa kekerasan fisik, verbal, maupun perundungan.'
      },
      {
        id: 'k4-q2',
        text: 'Hak anak atas waktu luang dan bermain berarti anak boleh meninggalkan seluruh kewajiban belajarnya di sekolah.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Waktu luang dan bermain berjalan seimbang dengan hak pendidikan untuk menjaga kesehatan mental dan kreativitas anak.'
      },
      {
        id: 'k4-q3',
        text: 'Ruang Bermain Ramah Anak (RBRA) harus memperhatikan keamanan alat bermain dan bebas dari bahaya lalu lintas.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'RBRA dirancang dengan standar keselamatan, material aman, dan pengawasan agar anak dapat bermain dengan nyaman.'
      },
      {
        id: 'k4-q4',
        text: 'Perundungan (bullying) melalui komentar jahat di media sosial tidak termasuk pelanggaran hak anak di sekolah.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Cyberbullying termasuk bentuk kekerasan psikis yang merusak mental anak dan harus dicegah oleh sekolah maupun keluarga.'
      },
      {
        id: 'k4-q5',
        text: 'Anak berhak mengikuti kegiatan seni, olahraga, dan pelestarian budaya daerah sesuai minat dan bakatnya.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Partisipasi dalam seni dan budaya membantu anak mengekspresikan diri, membangun percaya diri, dan mencintai budayanya.'
      },
      {
        id: 'k4-q6',
        text: 'Anak penyandang disabilitas berhak memperoleh akses pendidikan inklusif yang setara di sekolah.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Pendidikan inklusif menjamin setiap anak, termasuk anak dengan disabilitas, mendapat layanan belajar tanpa diskriminasi.'
      },
      {
        id: 'k4-q7',
        text: 'Jam istirahat dan tidur yang cukup tidak termasuk hak anak karena hanya kebutuhan orang tua.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Anak berhak atas waktu istirahat dan tidur yang cukup agar pertumbuhan fisik dan konsentrasinya terjaga.'
      },
      {
        id: 'k4-q8',
        text: 'Pusat Kreativitas Anak (PKA) menjadi sarana anak mengembangkan bakat literasi, sains, dan kesenian secara positif.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Pusat Kreativitas Anak menyediakan wadah positif bagi anak mengisi waktu luang dengan kegiatan edukatif.'
      },
      {
        id: 'k4-q9',
        text: 'Guru di Sekolah Ramah Anak dibenarkan mempermalukan siswa di depan kelas jika siswa tersebut membuat kesalahan.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Disiplin positif tidak menggunakan penghinaan atau kekerasan verbal yang menjatuhkan harga diri anak.'
      },
      {
        id: 'k4-q10',
        text: 'Wajib belajar 12 tahun bertujuan memastikan seluruh anak memperoleh pendidikan dasar hingga menengah yang berkualitas.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Akses pendidikan yang merata mencegah anak putus sekolah dan membuka peluang masa depan yang lebih baik.'
      }
    ]
  },
  {
    id: 5,
    code: 'Klaster 5',
    title: 'Perlindungan Khusus',
    shortTitle: 'Perlindungan',
    summary:
      'Perlindungan anak dalam situasi darurat, korban kekerasan atau eksploitasi, dan Anak Berhadapan dengan Hukum (ABH) melalui UPTD PPA.',
    stageTheme: {
      name: 'Benteng Perlindungan',
      subtitle: 'Stage Klaster 5'
    },
    questions: [
      {
        id: 'k5-q1',
        text: 'UPTD PPA di bawah DP3P2KB adalah layanan resmi untuk pengaduan, perlindungan, dan pendampingan anak korban kekerasan.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'UPTD PPA menyediakan layanan pengaduan, penjangkauan, pemulihan psikologis, hingga pendampingan hukum bagi korban.'
      },
      {
        id: 'k5-q2',
        text: 'Dalam kasus Anak Berhadapan dengan Hukum (ABH), identitas wajah dan nama asli anak wajib dipublikasikan ke media.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'UU Sistem Peradilan Pidana Anak melarang publikasi identitas ABH demi melindungi masa depan dan psikologis anak.'
      },
      {
        id: 'k5-q3',
        text: 'Pendekatan Keadilan Restoratif dan Diversi diutamakan bagi Anak Berhadapan dengan Hukum agar pemulihan lebih diutamakan daripada pemidanaan.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Diversi mengalihkan penyelesaian perkara anak dari proses peradilan pidana ke musyawarah demi kepentingan terbaik anak.'
      },
      {
        id: 'k5-q4',
        text: 'Mempekerjakan anak di bawah umur di sektor berbahaya yang mengganggu sekolahnya merupakan bentuk eksploitasi ekonomi.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Anak berhak dilindungi dari pekerja anak dan eksploitasi ekonomi yang membahayakan keselamatan serta pendidikannya.'
      },
      {
        id: 'k5-q5',
        text: 'Anak korban bencana alam tidak memerlukan layanan trauma healing karena anak-anak cepat lupa dengan sendirinya.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Anak dalam situasi darurat bencana wajib mendapat dukungan psikososial (trauma healing) dan ruang ramah anak.'
      },
      {
        id: 'k5-q6',
        text: 'Layanan pengaduan SAPA 129 dari Kementerian PPPA dapat digunakan masyarakat untuk melaporkan kekerasan terhadap anak.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Call center SAPA 129 dan layanan UPTD PPA daerah memudahkan pelaporan cepat ketika terjadi kekerasan pada anak.'
      },
      {
        id: 'k5-q7',
        text: 'Anak yang menjadi korban kekerasan seksual boleh disalahkan oleh lingkungan karena dianggap tidak bisa menjaga diri.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Korban kekerasan tidak pernah bersalah; pelaku yang bertanggung jawab, dan korban berhak atas perlindungan serta pemulihan.'
      },
      {
        id: 'k5-q8',
        text: 'Perlindungan khusus juga diberikan kepada anak dari kelompok minoritas, anak jalanan, dan anak korban penyalahgunaan NAPZA.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'UU Perlindungan Anak menjamin negara hadir memberikan rehabilitasi dan perlindungan khusus bagi seluruh kelompok rentan.'
      },
      {
        id: 'k5-q9',
        text: 'Eksploitasi seksual anak secara daring (online) bukan termasuk tindak pidana jika dilakukan tanpa bertemu langsung.',
        options: ['Benar', 'Salah'],
        correct: 1,
        explanation:
          'Grooming, pemerasan, atau penyebaran konten eksploitasi anak di internet adalah kejahatan serius yang dijerat hukum.'
      },
      {
        id: 'k5-q10',
        text: 'Pelibatan anak sebagai Pelapor (2P) membantu mendeteksi dini potensi kekerasan di lingkungan sekolah maupun rumah.',
        options: ['Benar', 'Salah'],
        correct: 0,
        explanation:
          'Ketika anak berani melapor kepada guru, orang tua, atau UPTD PPA, penanganan dapat dilakukan sebelum dampak memburuk.'
      }
    ]
  }
];
