module tb;
reg a, b;
  wire spec_y, impl_y;
  assign spec_y = ~(a & b);
  impl dut(.a(a), .b(b), .y(impl_y));
  initial begin
    a = 0; b = 0; #1; if (impl_y !== spec_y) begin $display("FAIL"); $finish; end
    a = 0; b = 1; #1; if (impl_y !== spec_y) begin $display("FAIL"); $finish; end
    a = 1; b = 0; #1; if (impl_y !== spec_y) begin $display("FAIL"); $finish; end
    a = 1; b = 1; #1; if (impl_y !== spec_y) begin $display("FAIL"); $finish; end
    $display("PASS function matches");
    $finish;
  end
endmodule
