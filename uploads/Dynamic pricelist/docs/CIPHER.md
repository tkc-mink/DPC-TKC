# 🔑 CIPHER.md — สเปกรหัสลับราคา (Pricelist)

> ปกป้องราคา **ทุน** และ **ราคาส่ง** ไม่ให้รั่วถึงคนที่ไม่มีสิทธิ์ โดยแสดงเป็นตัวอักษรแทนตัวเลข
> **คีย์ LOCKED แล้ว** — ห้ามเปลี่ยนถ้าไม่จำเป็น และต้องผ่าน audit

---

## 1. คีย์ (LOCKED)

### Cipher #1 — ทุน (Cost) · เฉพาะ Admin
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| X | T | N | S | F | V | L | C | B | K |

### Cipher #2 — ราคาส่ง (Wholesale B/A/S) · เซลล์ขึ้นไป
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| O | I | Z | M | D | E | H | Y | P | R |

### Reserved
- **`A`** = ตัวซ้ำตำแหน่งก่อนหน้า (repeat marker, สลับ toggle)

---

## 2. Algorithm

เดินทีละหลัก ถ้าหลักปัจจุบัน **ซ้ำกับหลักก่อนหน้า** ให้สลับ (`alt`) ระหว่างใช้ `A` กับตัวอักษรปกติ:

```php
// app/Services/CipherService.php
function encode(string $digits, array $cipher): string {
    $out = ''; $prev = null; $alt = false;
    foreach (str_split($digits) as $d) {
        if ($d === $prev) { $alt = !$alt; } else { $alt = false; }
        $out .= $alt ? 'A' : $cipher[(int)$d];
        $prev = $d;
    }
    return $out;
}
```

```ts
// resources/js/lib/cipher.ts  (ใช้เฉพาะ preview ฝั่ง admin)
export function encode(num: number, cipher: string[]): string {
  const digits = String(Math.round(num)); let out=''; let prev=null; let alt=false;
  for (const d of digits) { alt = d===prev ? !alt : false; out += alt ? 'A' : cipher[+d]; prev=d; }
  return out;
}
```

---

## 3. ตัวอย่าง (ใช้เป็น test cases)

| เลขจริง | cipher | ผลลัพธ์ | อธิบาย |
|---|---|---|---|
| 1818 | #1 | **TBTB** | 1→T, 8→B, 1→T, 8→B (ไม่มีซ้ำติดกัน) |
| 1111 | #1 | **TATA** | 1→T, 1ซ้ำ→A, 1→T, 1ซ้ำ→A |
| 2500 | #2 | **ZEOA** | 2→Z, 5→E, 0→O, 0ซ้ำ→A |
| 112334567889000 | #2 | **IAZMADEHYPAROAO** | ทดสอบซ้ำหลายจุด |

> ใส่ 4 เคสนี้เป็น unit test ของ `CipherService` — ต้องผ่านทั้งหมดก่อน merge

---

## 4. ความปลอดภัย (สำคัญที่สุด)

1. **ฐานข้อมูลเก็บเลขจริงเสมอ** — cipher เป็นแค่ "วิธีแสดงผล"
2. **Server ห้ามส่งเลขจริงให้ client ที่ไม่มีสิทธิ์**
   - Dealer/Counter ขอราคาส่ง → server `encode()` แล้วส่ง **เฉพาะ string** `"IPEO/IPZO/IYRO"` (ไม่มี 1850/1820/1790 ใน payload)
   - B-Tire ขอข้อมูล → ไม่มี field cost/bas ใน response เลย
   - ทำที่ **API Resource** ตาม role — ไม่ใช่ซ่อนด้วย CSS/JS
3. **client มี cipher map เฉพาะตอน Admin** (เพื่อ preview ตอนพิมพ์ในตาราง editor) — role อื่นไม่เคยได้ map
4. เก็บ map ใน `settings_hub.cipher_keys` (ไม่ hardcode) เผื่อเปลี่ยนในอนาคต

---

## 5. Setup Wizard (ครั้งแรก)
1. Welcome
2. ตั้ง Cipher #1 (ทุน)
3. ตั้ง Cipher #2 (ราคาส่ง)
4. ทดสอบ encode (โชว์ตัวอย่าง)
5. บันทึก + **พิมพ์/ดาวน์โหลดการ์ดสำรอง (PDF)** → เก็บกระดาษจริง (PERMANENT backup)
6. Lock + audit

## 6. เปลี่ยน Cipher (Admin)
- ต้อง **ระบุเหตุผล**
- สร้าง audit event ระดับ **Critical** + แจ้ง Telegram
- **ไม่กระทบข้อมูลจริง** — เปลี่ยนแค่ display layer (DB ยังเก็บเลขเดิม)
- เตือนชัด ๆ ใน UI ก่อนยืนยัน

---

## 7. การใช้ในระบบ
- ตาราง **Viewer**: คอลัมน์ทุน/ราคาส่งแสดงรหัส (สีเหลือง=#1, น้ำเงิน=#2)
- ตาราง **Editor**: admin พิมพ์เลขจริง → โชว์รหัสสด ๆ ใต้ช่อง (preview)
- **Popup**: admin เห็นทั้งเลขจริง + รหัสในวงเล็บ เช่น `1818 (TBTB)`
- **Status column**: ถ้าค่าเป็นรหัส cipher #2 → ส่วนลด = decode × 100

---

*คีย์นี้ตรงกับ PRD `02_PRD_TKC_Pricelist_Module_v6.md §4` — อย่าแก้โดยไม่อัปเดต PRD*
