//
//  widget.swift
//  widget
//

import WidgetKit
import SwiftUI
import Intents

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        var lookAhead: [Date] = []
        let entryDate = Date()
      
        for hourOffset in 0 ..< 3 {
          lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
        }
            
        return SimpleEntry(date: Date(),
                    lookAhead: lookAhead,
                    modules: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
      
      let userDefaults = UserDefaults.init(suiteName: "group.com.tandhjulet.lectimate.widget");
      if(userDefaults != nil) {
          var entryDate = Date()
          let currentHour = Calendar.current.component(.hour, from: entryDate)
          if(currentHour >= 21) {
              entryDate = Calendar.current.date(bySetting: .hour, value: 21, of: entryDate)!
              entryDate = Calendar.current.date(bySetting: .minute, value: 0, of: entryDate)!
          }
          
          if let savedData = userDefaults!.value(forKey: "skema") as? String {
              let decoder = JSONDecoder();
              decoder.dateDecodingStrategy = .millisecondsSince1970
              let data = savedData.data(using: .utf8);
              let parsedData = try? decoder.decode([String: [Module]].self, from: data!)
                  
              let currentDate = Calendar.current.component(.day, from: entryDate)
              
              var lookAhead: [Date] = []
              for hourOffset in 0 ..< 3 {
                lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
              }
              
              if(parsedData != nil) {
                  let lastDate = Array(parsedData!.values).last
                  let endDate = lastDate?.last?.end
                  
                  // if now is greater than the latest data entry,
                  // then no data is available
                  if(endDate != nil && entryDate > endDate!) {
                      // since this is a snapshot, we dont want it to look bad.
                      // therefor we just act like we have data:
                      let entry = SimpleEntry(date: entryDate,
                                            lookAhead: lookAhead,
                                              modules: [])
                          
                      completion(entry)
                      return;
                  }
              }
            
              let modules = parsedData?[String(currentDate)]
              
              let entry = SimpleEntry(date: entryDate,
                                    lookAhead: lookAhead,
                                      modules: (modules ?? [])!)
                  
              completion(entry)
              
          } else {
              var lookAhead: [Date] = []
              let entryDate = Date()
            
              for hourOffset in 0 ..< 3 {
                lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
              }
            
              let entry = SimpleEntry(date: entryDate,
                                    lookAhead: lookAhead,
                                    modules: [])
              completion(entry)
          }
      } else {
          let entry = SimpleEntry(date: Date(),
                                lookAhead: [],
                                  modules: [], error: true)
          completion(entry)
      }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let userDefaults = UserDefaults.init(suiteName: "group.com.tandhjulet.lectimate.widget");
        if(userDefaults != nil) {
            var entryDate = Date()
            let currentHour = Calendar.current.component(.hour, from: entryDate)
            if(currentHour >= 21) {
                entryDate = Calendar.current.date(bySetting: .hour, value: 21, of: entryDate)!
                entryDate = Calendar.current.date(bySetting: .minute, value: 0, of: entryDate)!
            }
            
            if let savedData = userDefaults!.value(forKey: "skema") as? String {
                let decoder = JSONDecoder();
                decoder.dateDecodingStrategy = .millisecondsSince1970
                let data = savedData.data(using: .utf8);
                let parsedData = try? decoder.decode([String: [Module]].self, from: data!)
                
                let currentDate = Calendar.current.component(.day, from: entryDate)
                let requestAfter = Calendar.current.date(byAdding: .hour, value: currentHour > 7 && currentHour < 16 ? 1 : 3, to: entryDate)!
                
                if(parsedData != nil) {
                    let lastDate = Array(parsedData!.values).last
                    let endDate = lastDate?.last?.end
                    
                    // if now is greater than the latest data entry,
                    // then no data is available
                    if(endDate != nil && entryDate > endDate!) {
                        let entry = SimpleEntry(date: entryDate,
                                              lookAhead: [],
                                                modules: [], hasData: false)
                            
                        let timeline = Timeline(entries: [entry], policy: .after(requestAfter))
                        completion(timeline)
                        return;
                    }
                }
                
                var lookAhead: [Date] = []
                for hourOffset in 0 ..< 3 {
                  lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
                }
              
                let modules = parsedData?[String(currentDate)];
                
                let entry = SimpleEntry(date: entryDate,
                                      lookAhead: lookAhead,
                                        modules: (modules ?? [])!, hasData: (parsedData != nil))
                    
                let timeline = Timeline(entries: [entry], policy: .after(requestAfter))
                completion(timeline)
                
            } else {
                var lookAhead: [Date] = []
                let entryDate = Date()
              
                for hourOffset in 0 ..< 3 {
                  lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
                }
              
                let entry = SimpleEntry(date: entryDate,
                                      lookAhead: lookAhead,
                                      modules: [])
                let timeline = Timeline(entries: [entry], policy: .after(lookAhead.last!))
                completion(timeline)
            }
        } else {
            let date = Calendar.current.date(byAdding: .hour, value: 2, to: Date())
            
            let entry = SimpleEntry(date: Date(),
                                  lookAhead: [],
                                    modules: [], error: true)
            let timeline = Timeline(entries: [entry], policy: .after(date!))
            completion(timeline)
        }
    }
}

extension Date {

    static func - (lhs: Date, rhs: Date) -> TimeInterval {
        return lhs.timeIntervalSinceReferenceDate - rhs.timeIntervalSinceReferenceDate
    }
  
    func dayOfWeek() -> String? {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "da-DK")
        dateFormatter.dateFormat = "EEEE"
        return dateFormatter.string(from: self)
    }

}

enum Status: String, Decodable {
  case changed
  case cancelled
  case normal
  
  init(from decoder: Decoder) throws {
    let label = try decoder.singleValueContainer()
    .decode(String.self)

    switch label {
      case "changed": self = .changed;
      case "cancelled": self = .cancelled;
      case "normal": self = .normal;
      default:
        self = .normal;
    }
  }
}

struct Module: Decodable {
    let start: Date
    let end: Date
  
    let title: String
    let status: Status
  
    let _id: String
  
    let width: CGFloat
    let left: CGFloat
}

struct SimpleEntry: TimelineEntry {
    let date: Date
  
    let lookAhead: Array<Date>
    let modules: Array<Module>
    
    var error: Bool = false
    var hasData: Bool = true
}

struct widgetEntryView : View {
    var entry: Provider.Entry
  
    func calculateTop(module: Module, first: Date, geoHeight: CGFloat) -> CGFloat {
      let diff = module.start - first;
      var top = ((diff+(2))/(60*60*2)) * (geoHeight);
      top = top < 0 ? 0 : top;
      
      return top;
    }
  
    private var ItemSeperator: some View {
      VStack(alignment: .leading, spacing: 0) {
        ForEach(entry.lookAhead, id: \.self) { lookAhead in
          Color.clear
            .frame(
              maxWidth: 0,
              maxHeight: 0
            )
          
          Divider().frame(maxWidth: .infinity, maxHeight: 10)
             
          if entry.lookAhead.last.self != lookAhead.self {
            Spacer()
          }
        }
      }
    }
    
    var body: some View {
        // check hasData aswell, so the next condition can take care of that state.
        // bad practice, but it is what it is.
      if #available(iOSApplicationExtension 17.0, *), (entry.lookAhead.count > 0 || !entry.hasData) {
        if(entry.lookAhead.first!.dayOfWeek() == entry.lookAhead.last!.dayOfWeek() && entry.hasData) {
          VStack {
            HStack(spacing: 0) {
              Text((entry.lookAhead.first ?? Date()).dayOfWeek()!)
                .font(.system(size: 11))
                .fontWeight(.heavy)
              
              Spacer()
              
              Text((entry.lookAhead.first ?? Date()).formatted(date: .numeric, time: .omitted))
                .font(.system(size: 10))
                .fontWeight(.regular)
            }
            
            HStack(spacing: 5) {
              if(!entry.error) {
                GeometryReader { geo in
                  ZStack(alignment: .leading) {
                    ItemSeperator.frame(width: geo.size.width)
                    
                    ForEach(entry.modules, id: \._id) { module in
                      if(module.end > entry.lookAhead.first! && module.start < entry.lookAhead.last!) {
                        let top = calculateTop(module: module, first: entry.lookAhead.first!, geoHeight: geo.size.height);
                        
                        VStack(spacing: 0) {
                          Color.clear
                            .opacity(0)
                            .frame(
                              maxWidth: .infinity,
                              maxHeight: top
                            )
                          
                          HStack(spacing: 0) {
                            Color.clear
                              .frame(width: module.left * geo.size.width, height: 0)
                            
                            ZStack(alignment: .topLeading) {
                              HStack {
                                Rectangle()
                                  .fill(module.status == .normal ? Color("Primary") : module.status == .changed ? Color.yellow : Color("Red"))
                                  .clipShape(
                                    .rect(
                                      topLeadingRadius: module.start > entry.lookAhead.first! ? 3 : 0,
                                      bottomLeadingRadius: 3,
                                      style: .continuous
                                    )
                                  )
                                  .frame(
                                    width: 3,
                                    height: .infinity
                                  )
                                
                                Spacer()
                              }
                              
                              Rectangle()
                                .fill(module.status == .normal ? Color("Primary") : module.status == .changed ? Color.yellow : Color("Red"))
                                .opacity(0.5)
                                .clipShape(
                                  .rect(
                                    topLeadingRadius: module.start > entry.lookAhead.first! ? 3 : 0,
                                    bottomLeadingRadius: 3,
                                    bottomTrailingRadius: 3,
                                    topTrailingRadius: module.start > entry.lookAhead.first! ? 3 : 0,
                                    style: .continuous
                                  )
                                )
                                .frame(
                                  width: .infinity, height: .infinity
                                )
                              
                              let height = calculateHeight(start: module.start, end: module.end, lookAhead: entry.lookAhead) * geo.size.height;
                              if(height > 10 + 4*2) {
                                ZStack() {
                                  VStack(alignment: .leading, spacing: 0) {
                                    Text(module.title)
                                      .font(.system(size:12, weight: .bold))
                                      .opacity(1)
                                      .multilineTextAlignment(.leading)
                                      .minimumScaleFactor(0.6)
                                      .foregroundStyle(module.status == .normal ? Color("Primary") : module.status == .changed ? Color.yellow : Color("Red"))
                                    
                                    if(height > 20 + 4*2) {
                                      Text(module.start.formatted(date: .omitted, time: .shortened) + (module.width >= 0.8 ? " \u{2022} " : "\n") + module.end.formatted(date: .omitted, time: .shortened))
                                        .font(.system(size: 10))
                                        .minimumScaleFactor(0.6)
                                        .multilineTextAlignment(.leading)
                                        .lineLimit(2)
                                        .foregroundStyle(module.status == .normal ? Color("Primary") : module.status == .changed ? Color.yellow : Color("Red"))
                                    }
                                    
                                  }
                                }.padding(EdgeInsets(top: 4, leading: 8, bottom: 8, trailing: 4))
                              }
                            }
                            .frame(width: module.width * geo.size.width, height: calculateHeight(start: module.start, end: module.end, lookAhead: entry.lookAhead) * geo.size.height)
                            
                            Spacer(minLength: 0)
                          }
                          
                          Spacer(minLength: 0)
                        }
                      }
                    }
                  }
                  .frame(
                    maxWidth: .infinity,
                    maxHeight: .infinity
                  )
                }
                
                VStack(alignment: .leading, spacing: 0) {
                  ForEach(entry.lookAhead, id: \.self) { lookAhead in
                    Color.clear
                      .frame(
                        maxWidth: 0,
                        maxHeight: 0
                      )
                    
                    let time = lookAhead.formatted(date: .omitted, time: .shortened)
                    
                    
                    Text(time.replacingOccurrences(of: ".", with: ":"))
                      .font(.system(
                        size:8.5
                      ))
                      .multilineTextAlignment(.trailing)
                      .frame(height: 10)
                      .foregroundColor(.secondary)
                    
                    if entry.lookAhead.last.self != lookAhead.self {
                      Spacer()
                    }
                  }
                }
              } else {
                
                Text("Der opstod en fejl").frame(
                  maxWidth: .infinity,
                  maxHeight: .infinity,
                  alignment: .center
                ).multilineTextAlignment(.center)
                
              }
            }
          }.containerBackground(for: .widget, content: {Color("AccentColor")})
        } else {
          VStack {
            Text("Skema ikke tilgængeligt")
              .multilineTextAlignment(.center)
          }.containerBackground(for: .widget, content: {Color("AccentColor")})
        }
    } else {
      VStack {
        Text("Skema-data kunne ikke indlæses. Log ind på appen.")
          .multilineTextAlignment(.center)
      }.containerBackground(for: .widget, content: {Color("AccentColor")})
    };
  }
}

@main
struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
        }
        .configurationDisplayName("Skemaoversigt")
        .description("Dan dig et overblik over dit skema")
    }
}

func calculateHeight(start: Date, end: Date, lookAhead: [Date]) -> CGFloat {
  let compareStart: Date = start < lookAhead.first! ? lookAhead.first! : start;
  let compareEnd: Date = end > lookAhead.last! ? lookAhead.last! : end;
  
  print(compareStart.formatted(), compareEnd.formatted())
  let diff = (compareEnd - compareStart) / (60*60*2);
  return diff;
}

struct widget_Previews: PreviewProvider {
    static func getEntry() -> SimpleEntry {
      var entry: SimpleEntry = SimpleEntry(date: Date(),
                                           lookAhead: [],
                                             modules: [], error: true);
      

      let entryDate = Date()
      let currentDate = Calendar.current.component(.day, from: entryDate)

      let parsedData = ["26": [Module(start: Calendar.current.date(byAdding: .day, value: -1, to: Date())!, end: Calendar.current.date(byAdding: .day, value: 1, to: Date())!, title: "test", status: .normal, _id: "123", width: 1, left: 0)]]
      
      var lookAhead: [Date] = []
      for hourOffset in 0 ..< 3 {
        lookAhead.append(Calendar.current.date(byAdding: .hour, value: hourOffset, to: entryDate)!)
      }
      
      
      let modules = parsedData[String(currentDate)]
                
      entry = SimpleEntry(date: Date(),
                            lookAhead: lookAhead,
                          modules: (modules ?? [])!, error: false)
  
        //entry = SimpleEntry(date: entryDate,
        //                      lookAhead: lookAhead,
        //                        modules: parsedData[String(currentDate)] ?? [])

      
      return entry;
    }
  
    static var previews: some View {
        widgetEntryView(entry: getEntry())
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
