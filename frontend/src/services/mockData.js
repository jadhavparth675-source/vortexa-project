/**
 * Realistic Mock Data for RailFlow Frontend.
 * strictly adheres to docs/api-contract.md schemas.
 */

export const mockHealthResponse = {
  status: "healthy",
  service: "railflow-backend",
  version: "1.0.0 (Mock Mode)",
};

export const mockDefaultTimetable = {
  station_id: "STN_CENTRAL",
  station_name: "New York Penn Station (Amtrak / Moynihan Train Hall)",
  minimum_gap_minutes: 5,
  platforms: [
    {
      platform_id: "P1",
      name: "Track 1 - Empire Corridor",
      is_active: true,
      description: "Albany-Rensselaer & Upstate NY Services",
    },
    {
      platform_id: "P2",
      name: "Track 2 - Northeast Corridor Southbound",
      is_active: true,
      description: "Philadelphia, Baltimore & Washington Union",
    },
    {
      platform_id: "P3",
      name: "Track 3 - Northeast Corridor Northbound",
      is_active: true,
      description: "Stamford, New Haven, Providence & Boston South",
    },
    {
      platform_id: "P4",
      name: "Track 4 - Keystone & Regional Connector",
      is_active: true,
      description: "Harrisburg, Long Island & National Long-Distance",
    },
  ],
  trains: [
    {
      train_id: "T100",
      name: "Acela Express 2151",
      origin: "Boston South Station (BOS)",
      destination: "Washington Union Station (WAS)",
      arrival_time: 550,
      departure_time: 565,
      formatted_arrival: "09:10",
      formatted_departure: "09:25",
      assigned_platform: "P1",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T109",
      name: "Northeast Regional 171",
      origin: "Boston South Station (BOS)",
      destination: "Newport News (NPN)",
      arrival_time: 560,
      departure_time: 575,
      formatted_arrival: "09:20",
      formatted_departure: "09:35",
      assigned_platform: "P2",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T110",
      name: "Lake Shore Limited 48",
      origin: "Chicago Union Station (CHI)",
      destination: "New York Penn Station (NYP)",
      arrival_time: 570,
      departure_time: 585,
      formatted_arrival: "09:30",
      formatted_departure: "09:45",
      assigned_platform: "P3",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T111",
      name: "Keystone Service 640",
      origin: "Harrisburg Transportation Center (HAR)",
      destination: "New York Penn Station (NYP)",
      arrival_time: 575,
      departure_time: 590,
      formatted_arrival: "09:35",
      formatted_departure: "09:50",
      assigned_platform: "P4",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T101",
      name: "Acela Express 2150",
      origin: "Washington Union Station (WAS)",
      destination: "Boston South Station (BOS)",
      arrival_time: 600,
      departure_time: 615,
      formatted_arrival: "10:00",
      formatted_departure: "10:15",
      assigned_platform: "P1",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T102",
      name: "Northeast Regional 174",
      origin: "Norfolk Station (NFK)",
      destination: "Boston South Station (BOS)",
      arrival_time: 615,
      departure_time: 630,
      formatted_arrival: "10:15",
      formatted_departure: "10:30",
      assigned_platform: "P2",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T103",
      name: "Acela Express 2154",
      origin: "Philadelphia 30th St (PHL)",
      destination: "Boston South Station (BOS)",
      arrival_time: 635,
      departure_time: 650,
      formatted_arrival: "10:35",
      formatted_departure: "10:50",
      assigned_platform: "P1",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T104",
      name: "Empire Service 283",
      origin: "New York Penn Station (NYP)",
      destination: "Niagara Falls (NFL)",
      arrival_time: 655,
      departure_time: 710,
      formatted_arrival: "10:55",
      formatted_departure: "11:10",
      assigned_platform: "P2",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T105",
      name: "Empire Service 280",
      origin: "Albany-Rensselaer (ALB)",
      destination: "New York Penn Station (NYP)",
      arrival_time: 600,
      departure_time: 610,
      formatted_arrival: "10:00",
      formatted_departure: "10:10",
      assigned_platform: "P3",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T106",
      name: "Silver Star 91",
      origin: "New York Penn Station (NYP)",
      destination: "Miami Central (MIA)",
      arrival_time: 640,
      departure_time: 650,
      formatted_arrival: "10:40",
      formatted_departure: "10:50",
      assigned_platform: "P3",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T107",
      name: "Crescent 19",
      origin: "New York Penn Station (NYP)",
      destination: "New Orleans Union Passenger Terminal (NOL)",
      arrival_time: 620,
      departure_time: 630,
      formatted_arrival: "10:20",
      formatted_departure: "10:30",
      assigned_platform: "P4",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T108",
      name: "Keystone Service 643",
      origin: "New York Penn Station (NYP)",
      destination: "Harrisburg Transportation Center (HAR)",
      arrival_time: 655,
      departure_time: 710,
      formatted_arrival: "10:55",
      formatted_departure: "11:10",
      assigned_platform: "P4",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T112",
      name: "Acela Express 2160",
      origin: "Washington Union Station (WAS)",
      destination: "New York Penn Station (NYP)",
      arrival_time: 715,
      departure_time: 730,
      formatted_arrival: "11:55",
      formatted_departure: "12:10",
      assigned_platform: "P1",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T113",
      name: "Northeast Regional 176",
      origin: "Washington Union Station (WAS)",
      destination: "Springfield Union (SPG)",
      arrival_time: 720,
      departure_time: 735,
      formatted_arrival: "12:00",
      formatted_departure: "12:15",
      assigned_platform: "P2",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T114",
      name: "Pennsylvanian 84",
      origin: "Pittsburgh Union Station (PGH)",
      destination: "New York Penn Station (NYP)",
      arrival_time: 705,
      departure_time: 720,
      formatted_arrival: "11:45",
      formatted_departure: "12:00",
      assigned_platform: "P3",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T115",
      name: "Northeast Regional 190",
      origin: "Richmond Main St (RVM)",
      destination: "New York Penn Station (NYP)",
      arrival_time: 725,
      departure_time: 740,
      formatted_arrival: "12:05",
      formatted_departure: "12:20",
      assigned_platform: "P4",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T116",
      name: "Keystone Service 645",
      origin: "New York Penn Station (NYP)",
      destination: "Philadelphia 30th St (PHL)",
      arrival_time: 735,
      departure_time: 750,
      formatted_arrival: "12:15",
      formatted_departure: "12:30",
      assigned_platform: "P1",
      delay_minutes: 0,
      status: "on_time",
    },
    {
      train_id: "T117",
      name: "Carolinian 80",
      origin: "Charlotte Gateway (CLT)",
      destination: "New York Penn Station (NYP)",
      arrival_time: 740,
      departure_time: 755,
      formatted_arrival: "12:20",
      formatted_departure: "12:35",
      assigned_platform: "P3",
      delay_minutes: 0,
      status: "on_time",
    },
  ],
  platform_closures: [],
};

export function mockParseDisruptions(text) {
  const disruptions = [];
  const warnings = [];

  const lower = text.toLowerCase();

  // Match train delay
  const delayMatch = text.match(/(?:train\s+)?([A-Za-z]?\d+)\s+delayed(?:\s+by)?\s+(\d+)\s*(?:min|mins|m)?/i);
  if (delayMatch) {
    const tid = delayMatch[1].toUpperCase().startsWith("T") ? delayMatch[1].toUpperCase() : `T${delayMatch[1]}`;
    disruptions.push({
      type: "train_delay",
      train_id: tid,
      delay_minutes: parseInt(delayMatch[2], 10),
      reason: "Mock parsed train delay",
    });
  }

  // Match platform closure
  const closureMatch = text.match(/(?:platform\s+(?:p)?|p)(\d+)\s+(?:is\s+)?closed\s*(?:from)?\s*(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/i);
  if (closureMatch) {
    const pid = `P${closureMatch[1]}`;
    const [startH, startM] = closureMatch[2].split(":").map(Number);
    const [endH, endM] = closureMatch[3].split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    disruptions.push({
      type: "platform_closure",
      platform_id: pid,
      start_time: startMin,
      end_time: endMin,
      formatted_start: closureMatch[2],
      formatted_end: closureMatch[3],
      reason: "Mock parsed platform closure",
    });
  }

  if (disruptions.length === 0) {
    warnings.push("No recognized disruption patterns found in input text.");
  }

  return {
    raw_text: text,
    disruptions,
    warnings,
    needs_confirmation: true,
  };
}

export function mockApplyDisruptions(timetable, disruptions) {
  const current = JSON.parse(JSON.stringify(timetable || mockDefaultTimetable));
  const changes = [];

  // If impossible disruption simulated (e.g. all platforms closed)
  if (disruptions.length >= 4 && disruptions.every((d) => d.type === "platform_closure")) {
    return {
      status: "no_solution",
      message: "No feasible platform assignment found satisfying all minimum-gap and platform constraints.",
      timetable: null,
      changes: [],
      validation: null,
    };
  }

  for (const d of disruptions) {
    if (d.type === "train_delay") {
      const train = current.trains.find((t) => t.train_id === d.train_id);
      if (train) {
        const oldVal = `${train.formatted_arrival} - ${train.formatted_departure}`;
        train.arrival_time += d.delay_minutes;
        train.departure_time += d.delay_minutes;
        train.delay_minutes += d.delay_minutes;
        train.status = "delayed";

        const ah = Math.floor(train.arrival_time / 60) % 24;
        const am = train.arrival_time % 60;
        const dh = Math.floor(train.departure_time / 60) % 24;
        const dm = train.departure_time % 60;
        train.formatted_arrival = `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;
        train.formatted_departure = `${String(dh).padStart(2, "0")}:${String(dm).padStart(2, "0")}`;

        changes.push({
          train_id: train.train_id,
          change_type: "delay_applied",
          field: "time",
          old_value: oldVal,
          new_value: `${train.formatted_arrival} - ${train.formatted_departure}`,
          reason: `Delayed by ${d.delay_minutes} min (Mock mode)`,
        });
      }
    } else if (d.type === "platform_closure") {
      current.platform_closures.push({
        closure_id: `C_${Date.now()}`,
        platform_id: d.platform_id,
        start_time: d.start_time,
        end_time: d.end_time,
        formatted_start: d.formatted_start,
        formatted_end: d.formatted_end,
        reason: d.reason || "Platform closure",
      });

      // Shift affected trains to alternate platform
      const affected = current.trains.filter(
        (t) =>
          t.assigned_platform === d.platform_id &&
          Math.max(t.arrival_time, d.start_time) < Math.min(t.departure_time, d.end_time)
      );

      for (const t of affected) {
        const oldP = t.assigned_platform;
        t.assigned_platform = oldP === "P2" ? "P3" : "P1";
        t.status = "reassigned";
        changes.push({
          train_id: t.train_id,
          change_type: "platform_reassigned",
          field: "platform",
          old_value: oldP,
          new_value: t.assigned_platform,
          reason: `Platform ${oldP} closed between ${d.formatted_start} and ${d.formatted_end}`,
        });
      }
    }
  }

  return {
    status: "success",
    message: `Timetable replanned successfully with ${changes.length} changes.`,
    timetable: current,
    changes,
    validation: {
      is_valid: true,
      errors: [],
      warnings: [],
      summary: {
        total_trains: current.trains.length,
        total_platforms: current.platforms.length,
        total_closures: current.platform_closures.length,
        conflict_count: 0,
      },
    },
  };
}

export function mockValidate(timetable) {
  const current = timetable || mockDefaultTimetable;
  return {
    is_valid: true,
    errors: [],
    warnings: [],
    summary: {
      total_trains: current.trains.length,
      total_platforms: current.platforms.length,
      total_closures: current.platform_closures.length,
      conflict_count: 0,
    },
  };
}

