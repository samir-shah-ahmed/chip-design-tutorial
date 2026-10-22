module tb;
reg [1:0] sel;
  reg a, b, c, d;
  wire y;
  lut_mux dut(.sel(sel), .a(a), .b(b), .c(c), .d(d), .y(y));
  initial begin
    a = 1; b = 0; c = 1; d = 0;
    sel = 0; #1; if (y !== a) begin $display("FAIL sel0"); $finish; end
    sel = 1; #1; if (y !== b) begin $display("FAIL sel1"); $finish; end
    sel = 2; #1; if (y !== c) begin $display("FAIL sel2"); $finish; end
    sel = 3; #1; if (y !== d) begin $display("FAIL sel3"); $finish; end
    $display("PASS mux");
    $finish;
  end
endmodule
