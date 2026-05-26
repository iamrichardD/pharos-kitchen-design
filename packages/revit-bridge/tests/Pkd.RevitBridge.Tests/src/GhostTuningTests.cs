/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Tests / Bridge-Revit
 * File: GhostTuningTests.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of the Ghost Tuning sync logic.
 * Traceability: Issue #125
 * ======================================================================== */

using Xunit;
using Pkd.RevitBridge;
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Pkd.RevitBridge.Tests
{
    // Mock handler to verify delta processing without Revit dependencies
    public class MockTuningHandler : IGhostTuningHandler
    {
        public ConcurrentQueue<TuningDelta> DeltaQueue { get; } = new ConcurrentQueue<TuningDelta>();
        public int SignalCount { get; private set; }

        public void EnqueueDelta(TuningDelta delta)
        {
            DeltaQueue.Enqueue(delta);
        }

        public void SignalUpdate()
        {
            SignalCount++;
        }
    }

    public class GhostTuningTests
    {
        [Fact]
        public async Task TestShould_DetectAndProcessDelta_WhenSyncFileCreated()
        {
            string tempPath = Path.Combine(Path.GetTempPath(), $"ghost_sync_{Guid.NewGuid()}.json");
            var handler = new MockTuningHandler();
            var listener = new GhostTuningListener(tempPath, handler);

            try 
            {
                // 1. Create a delta
                var deltas = new List<TuningDelta>
                {
                    new TuningDelta
                    {
                        MetadataId = "PHX-DW-001",
                        Parameters = new Dictionary<string, object> { { "PKD_Width", 3.0 } }
                    }
                };

                string json = JsonSerializer.Serialize(deltas);
                File.WriteAllText(tempPath, json);

                // 2. Start listener and wait for poll
                listener.Start();
                
                // Wait for the poll (default 1s)
                await Task.Delay(2000);

                // 3. Verify
                Assert.Single(handler.DeltaQueue);
                Assert.Equal(1, handler.SignalCount);
                
                if (handler.DeltaQueue.TryDequeue(out var received))
                {
                    Assert.Equal("PHX-DW-001", received.MetadataId);
                    // In the mock, the object value from JSON will be a JsonElement
                    var widthElement = (JsonElement)received.Parameters["PKD_Width"];
                    Assert.Equal(3.0, widthElement.GetDouble());
                }
            }
            finally
            {
                listener.Stop();
                if (File.Exists(tempPath)) File.Delete(tempPath);
            }
        }
    }
}
