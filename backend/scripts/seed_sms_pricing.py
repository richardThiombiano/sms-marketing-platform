"""
Script de seed pour la table sms_pricing.
Importe le catalogue de prix 3MI dans la base de données.

Utilisation:
    python -m scripts.seed_sms_pricing

Note: Les entrées "Other Networks" (MNC = "0x") sont marquées is_default=True
et servent de tarif par défaut pour un pays donné.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, delete
from app.core.database import async_session
from app.models import SmsPricing


# Catalogue 3MI complet (source: catalogue-prix.xlsx)
# Format: (MCC, MNC, MCCMNC, Operateur, CountryCode, CountryName, PrixUnitaire, Route)
PRICING_DATA = [
    # Burkina Faso (226) — 13 FCFA uniforme
    ("613", "2", "61302", "Celtel(Zain)", "226", "Burkina Faso", 13, "152"),
    ("613", "3", "61303", "Telecel Faso(Moov)", "226", "Burkina Faso", 13, "147"),
    ("613", "1", "61301", "Telmob S.A.", "226", "Burkina Faso", 13, "152"),
    ("613", "0x", "6130x", "Other Networks", "226", "Burkina Faso", 13, "141"),
    # Algeria (213)
    ("603", "1", "60301", "Mobilis", "213", "Algeria", 86.55, "138"),
    ("603", "2", "60302", "Djezzy", "213", "Algeria", 86.55, "138"),
    ("603", "3", "60303", "Nedjma", "213", "Algeria", 113.505, "138"),
    ("603", "0x", "6030x", "Other Networks", "213", "Algeria", 113.505, "138"),
    # Benin (229)
    ("616", "4", "61604", "BBCOM(Bell Benin)", "229", "Benin", 65.265, "138"),
    ("616", "2", "61602", "EtisalatBenin(TELCEL)", "229", "Benin", 30, "138"),
    ("616", "5", "61605", "Glomobile Benin Ltd.", "229", "Benin", 15, "138"),
    ("616", "1", "61601", "Office des(Libercom)", "229", "Benin", 15, "138"),
    ("616", "3", "61603", "Spacetel-Benin (MTN)", "229", "Benin", 15, "138"),
    ("616", "0x", "6160x", "Other Networks", "229", "Benin", 65.265, "138"),
    # Bulgaria (359)
    ("284", "3", "28403", "BTC mobile", "359", "Bulgaria", 7.0935, "139"),
    ("284", "1", "28401", "MobilTel AD", "359", "Bulgaria", 30.51, "139"),
    ("284", "5", "28405", "Cosmo Bulgaria Mobile", "359", "Bulgaria", 30.51, "139"),
    ("284", "0x", "2840x", "Other Networks", "359", "Bulgaria", 30.51, None),
    # Burundi (257)
    ("642", "2", "64202", "Africell", "257", "Burundi", 12.7695, "139"),
    ("642", "3", "64203", "ONATEL", "257", "Burundi", 28.38, "139"),
    ("642", "7", "64207", "HITS Telecom", "257", "Burundi", 18.45, "139"),
    ("642", "1", "64201", "Spacetel", "257", "Burundi", 12.7695, "139"),
    ("642", "82", "64282", "Telecel", "257", "Burundi", 12.7695, "139"),
    ("642", "0x", "6420x", "Other Networks", "257", "Burundi", 28.38, "139"),
    # Cameroon (237)
    ("624", "1", "62401", "MTN", "237", "Cameroon", 20.85, "138"),
    ("624", "4", "62404", "Nexttel", "237", "Cameroon", 28.38, "138"),
    ("624", "2", "62402", "Orange", "237", "Cameroon", 19.86, "138"),
    ("624", "0x", "6240x", "Other Networks", "237", "Cameroon", 28.38, "138"),
    # Central African Republic (236)
    ("623", "0x", "6230x", "Other Networks", "236", "Central African Rep.", 26.955, "138"),
    ("623", "1", "62301", "Atlantique(Moov CAR)", "236", "Central African Republic", 26.955, "138"),
    ("623", "4", "62304", "NationLink Telecom", "236", "Central African Republic", 26.955, "138"),
    ("623", "3", "62303", "Orange", "236", "Central African Republic", 14.1885, "138"),
    ("623", "2", "62302", "Telecel", "236", "Central African Republic", 17.025, "138"),
    # Congo, Dem. Rep. (243)
    ("630", "0x", "6300x", "Other Networks", "243", "Congo, Dem. Rep.", 42.57, "153"),
    ("630", "2", "63002", "Celtel(Zain)", "243", "Democratic Republic of the Congo", 18.585, "153"),
    ("630", "86", "63086", "CCT(Orange)", "243", "Democratic Republic of the Congo", 18.585, "153"),
    ("630", "5", "63005", "Sait-T(Tigo)", "243", "Democratic Republic of the Congo", 18.585, "153"),
    ("630", "89", "63089", "Sait-T(Tigo)", "243", "Democratic Republic of the Congo", 18.585, "153"),
    ("630", "1", "63001", "Vodacom", "243", "Democratic Republic of the Congo", 18.585, "153"),
    # Congo, Republic (242)
    ("629", "1", "62901", "Celtel Congo", "242", "Congo", 49.665, "138"),
    ("629", "10", "62910", "MTN(Libertis Tele)", "242", "Congo", 29.79, "138"),
    ("629", "7", "62907", "Warid Congo", "242", "Congo", 29.79, "138"),
    ("629", "2", "62902", "Azur SA (ETC)", "242", "Congo, Republic", 49.665, "138"),
    ("629", "0x", "6290x", "Other Networks", "242", "Congo, Republic", 49.665, "138"),
    # France (33)
    ("208", "1", "20801", "Orange France", "33", "France", 9.222, "138"),
    ("208", "0x", "2080x", "Other Networks", "33", "France", 15.6, "138"),
    ("208", "89", "20889", "Virgin Mobile/Omer", "33", "France", 9.222, "138"),
    ("208", "23", "20823", "Virgin Mobile/Omer", "33", "France", 9.222, "138"),
    ("208", "22", "20822", "Transatel", "33", "France", 12.06, "138"),
    ("208", "13", "20813", "SFR", "33", "France", 9.222, "138"),
    ("208", "11", "20811", "SFR", "33", "France", 9.222, "138"),
    ("208", "10", "20810", "SFR", "33", "France", 9.222, "138"),
    ("208", "9", "20809", "SFR", "33", "France", 9.222, "138"),
    ("208", "91", "20891", "Orange", "33", "France", 9.222, "138"),
    ("208", "2", "20802", "Outremer T", "33", "France", 9.222, "138"),
    ("208", "27", "20827", "AFONE SA", "33", "France", 9.222, "138"),
    ("208", "26", "20826", "NRJ", "33", "France", 9.222, "138"),
    ("208", "31", "20831", "Mundio Mobile", "33", "France", 4.257, "138"),
    ("208", "25", "20825", "Lycamobile", "33", "France", 4.257, "138"),
    ("208", "16", "20816", "Free Mobile", "33", "France", 12.7695, "138"),
    ("208", "15", "20815", "Free Mobile", "33", "France", 12.7695, "138"),
    ("208", "14", "20814", "Free Mobile", "33", "France", 12.7695, "138"),
    ("208", "88", "20888", "Bouygues Telecom", "33", "France", 12.06, "138"),
    ("208", "21", "20821", "Bouygues Telecom", "33", "France", 12.06, "138"),
    ("208", "20", "20820", "Bouygues Telecom", "33", "France", 12.06, "138"),
    # Ghana (233)
    ("620", "6", "62006", "Zain (Airtel)", "233", "Ghana", 8.3715, "139"),
    ("620", "4", "62004", "Kasapa Telecom Ltd", "233", "Ghana", 6.3855, "139"),
    ("620", "7", "62007", "Glo Mobile", "233", "Ghana", 10.215, "139"),
    ("620", "3", "62003", "Mobitel (tiGO)", "233", "Ghana", 11.2095, "139"),
    ("620", "1", "62001", "Scancom Ltd (MTN)", "233", "Ghana", 9.081, "139"),
    ("620", "2", "62002", "Ghana Tel(Vodafone)", "233", "Ghana", 11.3505, "139"),
    ("620", "0x", "6200x", "Other Networks", "233", "Ghana", 11.3505, "139"),
    # Guinea (224)
    ("611", "5", "61105", "Cellcom Guin", "224", "Guinea", 48.24, "138"),
    ("611", "3", "61103", "Intercel", "224", "Guinea", 39.72, "138"),
    ("611", "4", "61104", "Areeba-Guin", "224", "Guinea", 43.98, "138"),
    ("611", "1", "61101", "Orange Guin", "224", "Guinea", 68.1, "138"),
    ("611", "2", "61102", "SotelGui", "224", "Guinea", 49.665, "138"),
    ("611", "0x", "6110x", "Other Networks", "224", "Guinea", 68.1, "138"),
    # Guinea-Bissau (245)
    ("632", "3", "63203", "Orange Bissau", "245", "Guinea-Bissau", 14.1885, "139"),
    ("632", "2", "63202", "Areeba(SpaceTel)", "245", "Guinea-Bissau", 63.855, "139"),
    ("632", "0x", "6320x", "Other Networks", "245", "Guinea-Bissau", 63.855, "139"),
    # Italy (39)
    ("222", "99", "22299", "H3G S.p.A.", "39", "Italy", 36.465, "139"),
    ("222", "35", "22235", "LycaMobile", "39", "Italy", 36.465, "139"),
    ("222", "1", "22201", "TIM Italia", "39", "Italy", 42.57, "139"),
    ("222", "10", "22210", "Vodafone", "39", "Italy", 36.885, "139"),
    ("222", "88", "22288", "Wind Telecomunicazioni", "39", "Italy", 425.7, "139"),
    ("222", "0x", "2220x", "Other Networks", "39", "Italy", 36.885, None),
    # Ivory Coast (225)
    ("612", "2", "61202", "Atlantique Cellulaire (MOOV)", "225", "Ivory Coast", 60, "138"),
    ("612", "4", "61204", "Comium Ivory Coast Inc (KoZ)", "225", "Ivory Coast", 60, "138"),
    ("612", "5", "61205", "MTN", "225", "Ivory Coast", 45, "138"),
    ("612", "3", "61203", "Orange", "225", "Ivory Coast", 34.05, "138"),
    ("612", "6", "61206", "Oricel", "225", "Ivory Coast", 15, "138"),
    ("612", "0x", "6120x", "Other Networks", "225", "Ivory Coast", 65.265, "138"),
    # Mali (223)
    ("610", "1", "61001", "Malitel", "223", "Mali", 63, "166"),
    ("610", "2", "61002", "Orange Mali (Ikatel)", "223", "Mali", 78, "166"),
    ("610", "0x", "6100x", "Other Networks", "223", "Mali", 78, "166"),
    # Niger (227)
    ("614", "2", "61402", "Celtel-Niger", "227", "Niger", 6.3855, "168"),
    ("614", "3", "61403", "Moov-Niger", "227", "Niger", 6.9525, "165"),
    ("614", "1", "61401", "Niger Telecom", "227", "Niger", 12.7695, "165"),
    ("614", "4", "61404", "Zamani Telecom", "227", "Niger", 12.7695, "168"),
    ("614", "0x", "6140x", "Other Networks", "227", "Niger", 12.7695, "158"),
    # Nigeria (234)
    ("621", "20", "62120", "Celtel (Airtel)", "234", "Nigeria", 65.265, "139"),
    ("621", "60", "62160", "Etisalat(EMTS)", "234", "Nigeria", 4.5405, "139"),
    ("621", "50", "62150", "Globacom", "234", "Nigeria", 6.9525, "139"),
    ("621", "40", "62140", "M-Tel", "234", "Nigeria", 18.45, "139"),
    ("621", "30", "62130", "MTN", "234", "Nigeria", 9.9315, "139"),
    ("621", "99", "62199", "Starcoms", "234", "Nigeria", 26.955, "139"),
    ("621", "25", "62125", "Visafone Comm", "234", "Nigeria", 11.067, "139"),
    ("621", "0x", "6210x", "Other Networks", "234", "Nigeria", 65.265, "139"),
    # Senegal (221)
    ("608", "3", "60803", "Expresso (Sudatel)", "221", "Senegal", 68.1, "138"),
    ("608", "1", "60801", "Sonatel (Alize)", "221", "Senegal", 38.31, "138"),
    ("608", "2", "60802", "Tigo (Sentel GSM)", "221", "Senegal", 45.405, "138"),
    ("608", "0x", "6080x", "Other Networks", "221", "Senegal", 68.1, "138"),
    # Rwanda (250)
    ("635", "14", "63514", "Rwanda Airtel", "250", "Rwanda", 9.9315, "139"),
    ("635", "10", "63510", "MTN Rwandacell SARL", "250", "Rwanda", 15.6, "139"),
    ("635", "13", "63513", "TIGO RWANDA S.A", "250", "Rwanda", 15.6, "139"),
    ("635", "0x", "6350x", "Other Networks", "250", "Rwanda", 15.6, None),
    # Togo (228)
    ("615", "3", "61503", "Telecel", "228", "Togo", 51.075, "138"),
    ("615", "1", "61501", "Togocel", "228", "Togo", 29.79, "138"),
    ("615", "0x", "6150x", "Other Networks", "228", "Togo", 51.075, "138"),
    # Tunisia (216)
    ("605", "1", "60501", "Orange", "216", "Tunisia", 54.345, "139"),
    ("605", "3", "60503", "Tunisiana(Orascom)", "216", "Tunisia", 61.575, "139"),
    ("605", "2", "60502", "TunisieTelcom(TUNTEL)", "216", "Tunisia", 43.14, "139"),
    ("605", "0x", "6050x", "Other Networks", "216", "Tunisia", 61.575, "139"),
    # Morocco (212)
    ("604", "1", "60401", "Itissalat (IAM)", "212", "Morocco", 33.345, "139"),
    ("604", "2", "60402", "INWI (Wana)", "212", "Morocco", 28.38, "139"),
    ("604", "0", "60400", "Medi Telecom", "212", "Morocco", 34.755, "139"),
    ("604", "0x", "6040x", "Other Networks", "212", "Morocco", 34.755, "139"),
]


async def seed_pricing():
    """Importer le catalogue de prix dans la base de données."""
    async with async_session() as db:
        # Supprimer les anciennes données
        await db.execute(delete(SmsPricing))

        count = 0
        for row in PRICING_DATA:
            mcc, mnc, mccmnc, operator, country_code, country_name, unit_price, route = row
            is_default = mnc == "0x"  # "Other Networks" = tarif par défaut du pays

            pricing = SmsPricing(
                mcc=mcc,
                mnc=mnc,
                mccmnc=mccmnc,
                operator=operator,
                country_code=country_code,
                country_name=country_name,
                unit_price=unit_price,
                route=route,
                is_default=is_default,
            )
            db.add(pricing)
            count += 1

        await db.commit()
        print(f"✓ {count} entrées de tarification importées avec succès")

        # Afficher un résumé par pays
        from sqlalchemy import func as sqlfunc
        result = await db.execute(
            select(
                SmsPricing.country_code,
                SmsPricing.country_name,
                sqlfunc.count(SmsPricing.id),
            )
            .where(SmsPricing.is_default == True)
            .group_by(SmsPricing.country_code, SmsPricing.country_name)
            .order_by(SmsPricing.country_name)
        )
        print(f"\n{'Pays':<30} {'Code':<6} {'Prix défaut (FCFA)'}")
        print("-" * 60)

        for row in result.all():
            # Récupérer le prix par défaut
            default_result = await db.execute(
                select(SmsPricing.unit_price).where(
                    SmsPricing.country_code == row[0],
                    SmsPricing.is_default == True,
                ).limit(1)
            )
            default_price = default_result.scalar_one_or_none()
            print(f"  {row[1]:<28} {row[0]:<6} {default_price}")


if __name__ == "__main__":
    asyncio.run(seed_pricing())
