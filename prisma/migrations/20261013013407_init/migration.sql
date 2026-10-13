-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SCHOLAR', 'EDITOR');

-- CreateEnum
CREATE TYPE "HadithGrade" AS ENUM ('SAHIH', 'HASAN', 'DAIF', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('NEW', 'AI_DRAFTED', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surah" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTranslit" TEXT NOT NULL,
    "revelation" TEXT NOT NULL,
    "verseCount" INTEGER NOT NULL,

    CONSTRAINT "Surah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verse" (
    "id" SERIAL NOT NULL,
    "surahId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "numberInSurah" INTEGER NOT NULL,
    "textAr" TEXT NOT NULL,
    "juz" INTEGER,
    "page" INTEGER,

    CONSTRAINT "Verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationLanguage" (
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ltr',

    CONSTRAINT "TranslationLanguage_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" SERIAL NOT NULL,
    "verseId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TafsirSource" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ar',

    CONSTRAINT "TafsirSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tafsir" (
    "id" SERIAL NOT NULL,
    "verseId" INTEGER NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Tafsir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HadithCollection" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "author" TEXT,

    CONSTRAINT "HadithCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HadithBook" (
    "id" SERIAL NOT NULL,
    "collectionId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "nameAr" TEXT,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "HadithBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hadith" (
    "id" SERIAL NOT NULL,
    "collectionId" INTEGER NOT NULL,
    "bookId" INTEGER,
    "number" INTEGER NOT NULL,
    "arabic" TEXT NOT NULL,
    "english" TEXT,
    "grade" "HadithGrade" NOT NULL DEFAULT 'UNKNOWN',

    CONSTRAINT "Hadith_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HadithTopic" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "HadithTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiographyEvent" (
    "id" SERIAL NOT NULL,
    "order" INTEGER NOT NULL,
    "era" TEXT NOT NULL,
    "year" TEXT,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,

    CONSTRAINT "BiographyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaCategory" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "QaCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "body" TEXT NOT NULL,
    "categoryId" INTEGER,
    "status" "QuestionStatus" NOT NULL DEFAULT 'NEW',
    "aiDraft" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "answerAr" TEXT,
    "answerEn" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShahadaStep" (
    "id" SERIAL NOT NULL,
    "order" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "isRite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShahadaStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "message" TEXT NOT NULL,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_HadithTopics" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_HadithTopics_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Surah_number_key" ON "Surah"("number");

-- CreateIndex
CREATE INDEX "Verse_number_idx" ON "Verse"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Verse_surahId_numberInSurah_key" ON "Verse"("surahId", "numberInSurah");

-- CreateIndex
CREATE INDEX "Translation_languageCode_idx" ON "Translation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_verseId_languageCode_author_key" ON "Translation"("verseId", "languageCode", "author");

-- CreateIndex
CREATE UNIQUE INDEX "TafsirSource_slug_key" ON "TafsirSource"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tafsir_verseId_sourceId_key" ON "Tafsir"("verseId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "HadithCollection_slug_key" ON "HadithCollection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "HadithBook_collectionId_number_key" ON "HadithBook"("collectionId", "number");

-- CreateIndex
CREATE INDEX "Hadith_grade_idx" ON "Hadith"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "Hadith_collectionId_number_key" ON "Hadith"("collectionId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "HadithTopic_slug_key" ON "HadithTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "QaCategory_slug_key" ON "QaCategory"("slug");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "_HadithTopics_B_index" ON "_HadithTopics"("B");

-- AddForeignKey
ALTER TABLE "Verse" ADD CONSTRAINT "Verse_surahId_fkey" FOREIGN KEY ("surahId") REFERENCES "Surah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "TranslationLanguage"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tafsir" ADD CONSTRAINT "Tafsir_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tafsir" ADD CONSTRAINT "Tafsir_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TafsirSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HadithBook" ADD CONSTRAINT "HadithBook_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "HadithCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hadith" ADD CONSTRAINT "Hadith_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "HadithCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hadith" ADD CONSTRAINT "Hadith_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "HadithBook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QaCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HadithTopics" ADD CONSTRAINT "_HadithTopics_A_fkey" FOREIGN KEY ("A") REFERENCES "Hadith"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HadithTopics" ADD CONSTRAINT "_HadithTopics_B_fkey" FOREIGN KEY ("B") REFERENCES "HadithTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
