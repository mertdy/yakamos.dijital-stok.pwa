# Proje Kapsamındaki Kurallar

## Plan ve Yapıt (Artifact) Kalıcılığı & Dokümantasyon Güncelliği

Aşağıdaki planlama yapıtlarını oluşturduğunuzda veya güncellediğinizde:

- `implementation_plan.md`
- `task.md`
- `walkthrough.md`
- `srs.md`
- `design_document.md`

Bu dosyaların kopyalarını projenin `.agents` dizininde (`/Users/mertdy/Desktop/dijital-stok/.agents`) saklamak ZORUNDASINIZ.
Sistem dizininizdeki bu yapıtları güncellediğinizde, bu değişiklikleri `.agents` dizinindeki sürümlerle de senkronize etmelisiniz. Kullanıcı bu klasörde görünür ve takip edilebilir olmalarını beklemektedir.

**KRİTİK KURAL:** Projede bundan sonra yapılacak her türlü karar, mimari değişim, yeni özellik (feature) ekleme ve işlevsel kod değişikliklerinde; `.agents/srs.md` (Yazılım Gereksinimleri Şartnamesi) ve `.agents/design_document.md` (Sistem Tasarım Dokümanı) raporlarını da yapılan değişikliklere uygun olarak **otomatik olarak güncellemek ZORUNDASINIZ**. Bu raporlar her zaman kod tabanının güncel durumunu yansıtmalıdır.


## Bileşen Testleri

Yeni bir React bileşeni oluşturduğunuzda, onunla birlikte gelen birim testlerini (örn. `BilesenAdi.test.tsx`) aynı dizinde yazmak ZORUNDASINIZ. Bileşenin ana işlevselliğini, uç durumlarını ve erişilebilirlik niteliklerini test edin.

## Özellik Modülü Dışa Aktarmaları (Barrel Imports)

`src/features/` dizini içindeki özelliklerle çalışırken:

- Her özellik klasörü; bileşenlerini, depolarını (stores), hook'larını, görünümlerini ve tiplerini kök dizindeki bir `index.ts` dosyasında (barrel export) dışa aktararak herkese açık bir API tanımlamalıdır.
- **Özellikler arası içe aktarmalar (Cross-feature imports)**: Belirli bir özellik dizininin dışındaki dosyalar (diğer özellikler, ortak klasörler veya `App.tsx` gibi), özelliğin kök modül yolunu kullanarak içe aktarma yapmalıdır (örn. `import { X } from '@/features/ozellik-adi'`). Dışarıdan özellik alt yollarına (örn. `@/features/ozellik-adi/store/X`) doğrudan derinlemesine yapılan içe aktarmalar kesinlikle yasaktır.
- **Dahili içe aktarmalar (Internal imports)**: Bir özellik dizini içindeki dosyalar, derleme/çalışma zamanında dairesel bağımlılıkları (circular dependencies) önlemek için *aynı* özelliğin diğer öğelerini relative içe aktarmalar (`./` veya `../`) or belirli alt yollar kullanarak içe aktarmalıdır. Asla kendi barrel yollarından (`@/features/ozellik-adi`) içe aktarma yapmamalıdırlar.

## Path Aliasing & İçe Aktarma (Import) Standartları

- Projede `@/*` path aliasing (`src/*` dizinini işaret edecek şekilde) tanımlanmıştır. 
- **Mutlak İçe Aktarmalar (Absolute Imports)**: Diğer özelliklerden (features) veya ortak (shared) klasörlerden yapılan tüm içe aktarmalar `@/` takma adı kullanılarak yapılmalıdır (Örn: `import { SalesView } from '@/features/sales'`).
- **Göreceli İçe Aktarmalar (Relative Imports)**: Sadece aynı özellik/klasör içerisindeki dosyalar birbirini çağırırken relative (`./` veya `../`) yol kullanabilir.

## React Hook & İçe Aktarma (Import) Pratikleri

- React hook'ları (`useCallback`, `useEffect`, `useState`, `useMemo` vb.) kullanılırken `React.useCallback` gibi namespace üzerinden çağrılmamalı, doğrudan `react` paketinden import edilerek (`import { useCallback } from 'react'`) kullanılmalıdır.
- Eğer dosyada JSX haricinde `React` nesnesine doğrudan bir referans yoksa ve React 19 standartlarına uygunsa, kullanılmayan `import React from 'react'` satırları temizlenmelidir.

## Çevre Değişkenleri & Hassas Veri (Secrets) Yönetimi

- Firebase konfigürasyonları, PostHog anahtarları veya E2E test kullanıcı bilgileri gibi hiçbir hassas kimlik bilgisi (credential) kod içerisine hardcoded (sabit kodlanmış) olarak yazılmamalıdır.
- Tüm bu değişkenler merkezi `src/core/config/env.ts` dosyası içerisindeki `ENV` nesnesinden tüketilmelidir.

## HeroUI Modal Standartları

- Uygulamada özel modal overlay yapıları yerine HeroUI `<Modal>` bileşenleri kullanılmaktadır. Yeni bir modal eklenirken veya düzenlenirken şu hiyerarşi kesinlikle korunmalıdır:
  ```tsx
  <Modal isOpen={isOpen} onOpenChange={...}>
    <Modal.Backdrop>
      <Modal.Container>
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>...</Modal.Header>
          <Modal.Body>...</Modal.Body>
          <Modal.Footer>...</Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
  ```
- Kapatma tetikleyicisi (`<Modal.CloseTrigger />`), `<Modal.Dialog>` bileşeninin doğrudan ilk çocuğu (direct child) olarak yerleştirilmelidir.
- Başlık boyutları tutarlılık açısından `<Modal.Heading className="text-xl">` (veya `text-lg`) olarak ayarlanmalıdır.

## ESLint & Kod Kalitesi Kuralları

- Kod tabanında `// eslint-disable-*` yorum satırları ile kuralları geçici olarak kapatmak kesinlikle yasaktır. 
- Eğer geçersiz veya gereksiz bir kural bulunuyorsa, bu kural inline olarak kapatılmak yerine projenin kök dizinindeki `eslint.config.js` veya `tsconfig.json` üzerinden devre dışı bırakılmalı ya da kurallara uygun şekilde kod refaktör edilmelidir.

## Kalite Güvencesi (QA) & Doğrulama Döngüsü

Kod tabanının kararlılığını sağlamak, gerilemeleri (regression) önlemek ve katı kod kalitesini zorunlu kılmak için, kod ürettiğinizde, değiştirdiğinizde veya sildiğinizde (değiştirilen dosyalar yalnızca `.agents/` dizini içinde olmadığı sürece) aşağıdaki doğrulama adımlarını uygulamak ZORUNDASINIZ:

1. **Biçimlendirme ve Lint (Hedefli):**
   - Sadece eklediğiniz veya değiştirdiğiniz dosyalar üzerinde `pnpm prettier --write <dosya-yolu>` komutunu çalıştırın.
   - Sözdizimi ve stil sorunlarını kontrol etmek için yalnızca değiştirilen dosyalar üzerinde `pnpm eslint <dosya-yolu>` komutunu çalıştırın. Lint hataları bulunursa hemen düzeltin.

2. **Test Döngüsü (Hedefli & Genel):**
   - **Yeni Özellikler:** Yeni bir özellik, bileşen, hook veya yardımcı araç eklediğinizde, ilgili birim testlerini aynı dizinde yazmak ZORUNDASINIZ ("Bileşen Testleri" kuralında açıklandığı gibi).
   - **Silinen Özellikler:** Bir özelliği kaldırır veya refaktör ederseniz, ilgili test dosyalarını/bloklarını temizlemeli, refaktör etmeli veya silmelisiniz. Yetim kalmış veya bozuk testler kalmamalıdır.
   - **Hedefli Test Çalıştırma:** Değişikliklerinizi yerel ve hızlı bir şekilde doğrulamak için önce `pnpm test -- <değiştirilen-test-dosyası-yolu>` komutunu çalıştırın.
   - **Küresel Test Çalıştırma:** Hedefli testler geçtikten sonra, hiçbir gerileme olmadığından emin olmak için tüm test paketini `pnpm test` ile çalıştırın. Yapılan değişiklikler kritik akışları (POS, Ödemeler vb.) etkiliyorsa Playwright E2E testlerini de çalıştırarak doğrulayın: `pnpm test:e2e`

3. **Derleme (Build) Doğrulaması:**
   - TypeScript projesini derlemek ve derleme veya paketleme hatası olmadığını doğrulamak için `pnpm build` komutunu çalıştırın.

4. **Kendi Kendine Düzeltme & Yineleme Sınırı:**
   - Herhangi bir adım (lint, test veya build) başarısız olursa derleyici çıktısını, lint hatalarını veya test hatalarını analiz edin ve kodu düzeltin.
   - En fazla **3 kendi kendine düzeltme döngüsü** gerçekleştirmenize izin verilir. Eğer proje 3 denemeden sonra hala derlenmiyorsa, lint edilmiyorsa veya testleri geçmiyorsa DURUN ve hata günlükleri ile ne denediğinizi açıklayarak kullanıcıdan yardım isteyin.

5. **Başarı Onayı:**
   - Tüm adımlar (lint -> test -> build) sıfır hatayla başarıyla tamamlandığında, gerçekleştirilen kontrollerin özetini kullanıcıya sunarak başarıyı onaylayın.

---

# Permanent AI Agent Working Rules

Every AI agent working on this repository MUST strictly adhere to the following rules:

## 1. Documentation Is Part of the Codebase
*   Project documentation is considered part of the source code.
*   No implementation task is complete until all affected documentation has been updated.
*   Documentation must never become outdated.

## 2. Source of Truth
*   The implementation is always the source of truth.
*   Never document assumptions. Never invent features.
*   If documentation conflicts with the implementation, update the documentation.

## 3. Documentation Loading
At the beginning of every new session, before making changes, read all relevant documentation.
*   **Always read:**
    *   `README.md`
    *   `docs/AI_CONTEXT.md`
*   **Additionally, read task-relevant docs as needed:**
    *   `docs/ARCHITECTURE.md`
    *   `docs/FEATURES.md`
    *   `docs/API.md`
    *   `docs/CONVENTIONS.md`
    *   `docs/DECISIONS.md`
    *   `docs/ROADMAP.md`
    *   `docs/PROJECT_STRUCTURE.md`
    *   `docs/GLOSSARY.md`
*   *Tip:* Only load documentation relevant to the current task to minimize unnecessary context usage.

## 4. Automatic Documentation Maintenance
After every implementation task, determine which documentation files are affected and update them automatically:
*   **New feature** → Update `docs/FEATURES.md`
*   **Architecture changes** → Update `docs/ARCHITECTURE.md`
*   **API / DB Schema changes** → Update `docs/API.md`
*   **Folder / Catalog changes** → Update `docs/PROJECT_STRUCTURE.md`
*   **Coding standards / Import rules** → Update `docs/CONVENTIONS.md`
*   **Important design decisions** → Append new ADR to `docs/DECISIONS.md`
*   **Roadmap progress** → Update `docs/ROADMAP.md`
*   **Business terminology changes** → Update `docs/GLOSSARY.md`
*   **Agent knowledge base updates** → Update `docs/AI_CONTEXT.md`
*   **Build, setups, scripts, or deployment updates** → Update root `README.md`

## 5. Documentation Quality
Documentation must:
*   Reflect the current implementation.
*   Avoid duplication and redundancy.
*   Explain **WHY** as well as **WHAT**.
*   Remain concise and link to other documents instead of repeating content.
*   Use Markdown best practices and Mermaid diagrams where useful.
*   Stay internally consistent.

## 6. Before Writing Code
Before implementing anything:
1.  Understand the existing architecture.
2.  Search for reusable components.
3.  Search for existing utilities.
4.  Search for existing hooks.
5.  Follow existing conventions.
6.  Avoid introducing duplicate logic.

## 7. Architecture Rules
*   Prefer consistency over novelty.
*   Avoid introducing new patterns, new folder structures, unnecessary dependencies, or unnecessary abstractions unless there is a clear, documented technical justification.

## 8. Architectural Decisions
*   Whenever an important technical decision is made, append a new entry to `docs/DECISIONS.md`.
*   Never rewrite or modify historical decisions.

## 9. AI Context Maintenance
*   Maintain `docs/AI_CONTEXT.md` continuously.
*   Ensure this document contains the minimum information required for a new AI agent to quickly understand the project.
*   Whenever project knowledge changes, update this file immediately.

## 10. Repository Awareness
*   Before making significant changes, inspect the relevant parts of the repository instead of relying on assumptions.
*   Always prefer existing project patterns over creating new ones.

## 11. Task Completion Checklist
A task is complete only when:
*   [ ] The implementation is fully finished and verified.
*   [ ] The codebase architecture remains consistent without duplicated logic.
*   [ ] All affected documentation files have been updated and synchronized.
*   [ ] `docs/AI_CONTEXT.md` has been updated if necessary.

