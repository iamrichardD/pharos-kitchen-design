/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Bridge-Revit / Ghost Tuning
 * File: GhostTuning.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Implements background listening and state reconciliation for "Ghost Link" tuning.
 * Traceability: Issue #125, ADR-0039
 * ======================================================================== */

using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;

#if REVIT_UI
using Autodesk.Revit.UI;
using Autodesk.Revit.DB;
#endif

namespace Pkd.RevitBridge
{
    /// <summary>
    /// Interface for handling tuning deltas.
    /// Why: Enables unit testing of the listener without Revit API dependencies.
    /// </summary>
    public interface IGhostTuningHandler
    {
        void EnqueueDelta(TuningDelta delta);
        void SignalUpdate();
    }

#if REVIT_UI
    /// <summary>
    /// Event handler for updating Revit elements from a non-UI thread.
    /// Why: The Revit API is single-threaded; all modifications must occur on the main thread via ExternalEvent.
    /// </summary>
    public class GhostTuningEventHandler : IExternalEventHandler, IGhostTuningHandler
    {
        internal readonly ConcurrentQueue<TuningDelta> DeltaQueue = new ConcurrentQueue<TuningDelta>();
        private ExternalEvent? _externalEvent;

        public void SetExternalEvent(ExternalEvent externalEvent)
        {
            _externalEvent = externalEvent;
        }

        public void EnqueueDelta(TuningDelta delta)
        {
            DeltaQueue.Enqueue(delta);
        }

        public void SignalUpdate()
        {
            _externalEvent?.Raise();
        }

        public void Execute(UIApplication app)
        {
            Document doc = app.ActiveUIDocument.Document;
            
            while (DeltaQueue.TryDequeue(out TuningDelta? delta))
            {
                if (delta == null) continue;

                using (Transaction trans = new Transaction(doc, $"Tune Ghost: {delta.MetadataId}"))
                {
                    trans.Start();
                    
                    try 
                    {
                        // 1. Find the target DirectShape
                        DirectShape? target = new FilteredElementCollector(doc)
                            .OfClass(typeof(DirectShape))
                            .Cast<DirectShape>()
                            .FirstOrDefault(ds => ds.ApplicationDataId == delta.MetadataId && ds.ApplicationId == "PharosProjectPrism");

                        if (target != null)
                        {
                            UpdateDirectShape(doc, target, delta);
                        }
                    }
                    catch (Exception ex)
                    {
                        // Fail Fast: Log the error but don't crash the event loop
                        Console.WriteLine($"[GhostTuning] Failed to update {delta.MetadataId}: {ex.Message}");
                    }

                    trans.Commit();
                }
            }
        }

        private void UpdateDirectShape(Document doc, DirectShape ds, TuningDelta delta)
        {
            // 1. Update Parameters (Metadata-First Reconciliation)
            foreach (var param in delta.Parameters)
            {
                Parameter p = ds.LookupParameter(param.Key);
                if (p != null && !p.IsReadOnly)
                {
                    p.Set(param.Value?.ToString() ?? string.Empty);
                }
            }

            // 2. Update Geometry (If manifest changed)
            if (delta.GeometryManifest != null)
            {
                var interpreter = new ProceduralDirectShapeInterpreter();
                List<GeometryObject> newShape = new List<GeometryObject>();
                
                foreach (var op in delta.GeometryManifest.Operations)
                {
                    newShape.AddRange(interpreter.GenerateSolids(op));
                }
                
                if (newShape.Count > 0)
                {
                    ds.SetShape(newShape);
                }
            }
        }

        public string GetName() => "Pharos Ghost Tuning Handler";
    }
#endif

    /// <summary>
    /// Represents a change in metadata or geometry for a specific equipment ID.
    /// </summary>
    public class TuningDelta
    {
        public string MetadataId { get; set; } = string.Empty;
        public Dictionary<string, object> Parameters { get; set; } = new Dictionary<string, object>();
        public GeometryManifest? GeometryManifest { get; set; }
    }

    /// <summary>
    /// Background listener that watches for state changes in the synced registry.
    /// Why: Enables real-time reconciliation between the Web UI and the Revit model.
    /// </summary>
    public class GhostTuningListener
    {
        private readonly string _syncPath;
        private readonly IGhostTuningHandler _handler;
        private CancellationTokenSource? _cts;
        private DateTime _lastUpdate = DateTime.MinValue;

        public GhostTuningListener(string syncPath, IGhostTuningHandler handler)
        {
            _syncPath = syncPath;
            _handler = handler;
        }

        public void Start()
        {
            _cts = new CancellationTokenSource();
            Task.Run(() => PollLoop(_cts.Token));
        }

        public void Stop()
        {
            _cts?.Cancel();
        }

        private async Task PollLoop(CancellationToken token)
        {
            Console.WriteLine($"[GhostTuning] Listener started on {_syncPath}");
            
            while (!token.IsCancellationRequested)
            {
                try
                {
                    if (File.Exists(_syncPath))
                    {
                        DateTime lastWrite = File.GetLastWriteTime(_syncPath);
                        if (lastWrite > _lastUpdate)
                        {
                            _lastUpdate = lastWrite;
                            ProcessSyncFile();
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Fail Fast: Report errors but keep polling
                    Console.WriteLine($"[GhostTuning] Poll error: {ex.Message}");
                }

                await Task.Delay(1000, token); // Poll every second
            }
        }

        private void ProcessSyncFile()
        {
            try 
            {
                string json = File.ReadAllText(_syncPath);
                var deltas = JsonSerializer.Deserialize<List<TuningDelta>>(json);
                
                if (deltas != null && deltas.Count > 0)
                {
                    foreach (var delta in deltas)
                    {
                        _handler.EnqueueDelta(delta);
                    }
                    _handler.SignalUpdate();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GhostTuning] Failed to process sync file: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Orchestrator for the Ghost Tuning system.
    /// </summary>
    public static class GhostTuningManager
    {
        private static GhostTuningListener? _listener;

#if REVIT_UI
        private static ExternalEvent? _externalEvent;
        private static GhostTuningEventHandler? _handler;

        public static void Initialize(string syncPath)
        {
            _handler = new GhostTuningEventHandler();
            _externalEvent = ExternalEvent.Create(_handler);
            _handler.SetExternalEvent(_externalEvent);
            _listener = new GhostTuningListener(syncPath, _handler);
            _listener.Start();
        }

        public static void Shutdown()
        {
            _listener?.Stop();
            _externalEvent?.Dispose();
        }
#else
        public static void Initialize(string syncPath, IGhostTuningHandler handler)
        {
            _listener = new GhostTuningListener(syncPath, handler);
            _listener.Start();
        }

        public static void Shutdown()
        {
            _listener?.Stop();
        }
#endif
    }
}
